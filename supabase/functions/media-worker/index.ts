import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decode } from "https://deno.land/std@0.177.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if this is a forced retry for a specific message
    let body: { message_id?: string; force?: boolean } = {};
    try {
      body = await req.json();
    } catch {
      // No body is fine for cron jobs
    }

    if (body.message_id && body.force) {
      // Handle single message retry
      const { data: message } = await supabase
        .from("whatsapp_messages")
        .select("*, session:whatsapp_sessions(*)")
        .eq("id", body.message_id)
        .single();

      if (message) {
        console.log(`Force retry for message ${body.message_id}`);
        
        // Mark as pending
        await supabase
          .from("whatsapp_messages")
          .update({ media_status: 'pending', media_error: null })
          .eq("id", body.message_id);

        // Check if job already exists
        const { data: existingJob } = await supabase
          .from("media_jobs")
          .select("id")
          .eq("message_id", body.message_id)
          .eq("status", "pending")
          .maybeSingle();

        if (!existingJob) {
          // Create a new job
          await supabase.from("media_jobs").insert({
            organization_id: message.session.organization_id,
            message_id: message.id,
            session_id: message.session_id,
            conversation_id: message.conversation_id,
            message_key: { id: message.message_id },
            media_type: message.message_type,
            media_mime_type: message.media_mime_type,
            status: 'pending',
            attempts: 0,
            next_retry_at: new Date().toISOString(),
          });
        } else {
          // Reset existing job
          await supabase
            .from("media_jobs")
            .update({
              status: 'pending',
              attempts: 0,
              next_retry_at: new Date().toISOString(),
              error_message: null,
            })
            .eq("id", existingJob.id);
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: "Retry scheduled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch pending media jobs
    const { data: jobs, error: fetchError } = await supabase
      .from("media_jobs")
      .select("*")
      .eq("status", "pending")
      .lte("next_retry_at", new Date().toISOString())
      .order("created_at", { ascending: true })
      .limit(10);

    if (fetchError) {
      console.error("Error fetching media jobs:", fetchError);
      return new Response(
        JSON.stringify({ success: false, error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${jobs?.length || 0} media jobs`);

    const results = [];

    for (const job of jobs || []) {
      try {
        // Mark job as processing
        await supabase
          .from("media_jobs")
          .update({ status: "processing", updated_at: new Date().toISOString() })
          .eq("id", job.id);

        // Get session info
        const { data: session } = await supabase
          .from("whatsapp_sessions")
          .select("*")
          .eq("id", job.session_id)
          .single();

        if (!session) {
          throw new Error("Session not found");
        }

        // Try multiple strategies to download media
        let mediaContent: Uint8Array | null = null;
        const messageId = job.message_key?.id;

        if (EVOLUTION_API_URL && EVOLUTION_API_KEY && messageId) {
          // Strategy 1: getBase64FromMediaMessage with retries
          mediaContent = await tryGetBase64(
            EVOLUTION_API_URL,
            EVOLUTION_API_KEY,
            session.instance_name,
            job.message_key,
            job.media_type
          );

          // Strategy 2: downloadMedia endpoint
          if (!mediaContent) {
            mediaContent = await tryDownloadMedia(
              EVOLUTION_API_URL,
              EVOLUTION_API_KEY,
              session.instance_name,
              job.message_key
            );
          }
        }

        if (mediaContent && mediaContent.length > 100) {
          // Store in Supabase Storage with standardized path
          const extension = getExtensionFromMime(job.media_mime_type || "");
          const filePath = `orgs/${session.organization_id}/sessions/${session.id}/media/${messageId}.${extension}`;
          
          const { error: uploadError } = await supabase.storage
            .from("whatsapp-media")
            .upload(filePath, mediaContent, {
              contentType: job.media_mime_type?.split(";")[0] || "application/octet-stream",
              upsert: true,
            });

          if (uploadError) {
            throw new Error(`Upload failed: ${uploadError.message}`);
          }

          const { data: urlData } = supabase.storage
            .from("whatsapp-media")
            .getPublicUrl(filePath);

          const mediaUrl = urlData.publicUrl;

          // Success - update message
          await supabase
            .from("whatsapp_messages")
            .update({
              media_url: mediaUrl,
              media_storage_path: filePath,
              media_status: "ready",
              media_error: null,
            })
            .eq("id", job.message_id);

          // Mark job as completed
          await supabase
            .from("media_jobs")
            .update({
              status: "completed",
              updated_at: new Date().toISOString(),
            })
            .eq("id", job.id);

          console.log(`Job ${job.id} completed: ${mediaUrl}`);
          results.push({ job_id: job.id, status: "completed", media_url: mediaUrl });
        } else {
          throw new Error("Could not download media from any strategy");
        }

      } catch (error) {
        console.error(`Error processing job ${job.id}:`, error);
        
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const newAttempts = job.attempts + 1;
        const isFinalAttempt = newAttempts >= job.max_attempts;

        if (isFinalAttempt) {
          // Mark as permanently failed
          await supabase
            .from("whatsapp_messages")
            .update({
              media_status: "failed",
              media_error: `Falha após ${newAttempts} tentativas: ${errorMessage}`,
            })
            .eq("id", job.message_id);

          await supabase
            .from("media_jobs")
            .update({
              status: "failed",
              error_message: errorMessage,
              attempts: newAttempts,
              updated_at: new Date().toISOString(),
            })
            .eq("id", job.id);

          console.log(`Job ${job.id} permanently failed after ${newAttempts} attempts`);
        } else {
          // Schedule retry with exponential backoff
          // Backoff: 30s, 2min, 8min, 30min
          const backoffSeconds = Math.pow(4, newAttempts) * 30;
          const nextRetry = new Date(Date.now() + backoffSeconds * 1000);

          await supabase
            .from("media_jobs")
            .update({
              status: "pending",
              attempts: newAttempts,
              next_retry_at: nextRetry.toISOString(),
              error_message: errorMessage,
              updated_at: new Date().toISOString(),
            })
            .eq("id", job.id);

          console.log(`Job ${job.id} retry scheduled in ${backoffSeconds}s (attempt ${newAttempts})`);
        }

        results.push({
          job_id: job.id,
          status: isFinalAttempt ? "failed" : "retry_scheduled",
          error: errorMessage,
          attempt: newAttempts,
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Media worker error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Strategy 1: Try getBase64FromMediaMessage with retries
async function tryGetBase64(
  apiUrl: string,
  apiKey: string,
  instanceName: string,
  messageKey: any,
  mediaType: string
): Promise<Uint8Array | null> {
  console.log("Strategy 1: Trying getBase64FromMediaMessage...");
  
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      if (attempt > 1) {
        await delay(2000 * attempt);
      }

      const response = await fetch(
        `${apiUrl}/chat/getBase64FromMediaMessage/${instanceName}`,
        {
          method: "POST",
          headers: {
            "apikey": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: { key: messageKey },
            convertToMp4: mediaType === "audio",
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.base64) {
          console.log(`Strategy 1 success on attempt ${attempt}`);
          return decode(data.base64);
        }
      }
    } catch (e) {
      console.error(`Strategy 1 attempt ${attempt} error:`, e);
    }
  }
  
  return null;
}

// Strategy 2: Try downloadMedia endpoint
async function tryDownloadMedia(
  apiUrl: string,
  apiKey: string,
  instanceName: string,
  messageKey: any
): Promise<Uint8Array | null> {
  console.log("Strategy 2: Trying downloadMedia endpoint...");
  
  const endpoints = [
    `${apiUrl}/chat/downloadMedia/${instanceName}`,
    `${apiUrl}/message/downloadMedia/${instanceName}`,
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "apikey": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: { key: messageKey } }),
      });

      if (response.ok) {
        const contentType = response.headers.get("content-type") || "";
        
        if (!contentType.includes("application/json")) {
          const buffer = await response.arrayBuffer();
          if (buffer.byteLength > 100) {
            console.log(`Strategy 2 success: ${buffer.byteLength} bytes`);
            return new Uint8Array(buffer);
          }
        } else {
          const data = await response.json();
          if (data.base64) {
            console.log("Strategy 2 success via base64");
            return decode(data.base64);
          }
        }
      }
    } catch (e) {
      console.log(`Endpoint ${endpoint} failed:`, e);
    }
  }

  return null;
}

function getExtensionFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/heic": "heic",
    "video/mp4": "mp4",
    "video/3gpp": "3gp",
    "video/quicktime": "mov",
    "audio/ogg": "ogg",
    "audio/ogg; codecs=opus": "ogg",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/aac": "aac",
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "text/csv": "csv",
  };
  return map[mime] || mime.split("/")[1]?.split(";")[0] || "bin";
}
