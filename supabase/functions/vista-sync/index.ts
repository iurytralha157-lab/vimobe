import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, organization_id } = await req.json();

    if (!organization_id) {
      return new Response(JSON.stringify({ error: "organization_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get integration config
    const { data: integration, error: intError } = await supabase
      .from("vista_integrations")
      .select("*")
      .eq("organization_id", organization_id)
      .single();

    if (intError || !integration) {
      return new Response(
        JSON.stringify({ error: "Integration not configured" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let apiUrl = integration.api_url.replace(/\/+$/, "");
    // Auto-add protocol if missing
    if (!/^https?:\/\//i.test(apiUrl)) {
      apiUrl = `https://${apiUrl}`;
    }
    const apiKey = integration.api_key;

    // ---- TEST MODE ----
    if (action === "test") {
      try {
        const testPayload = {
          fields: ["Codigo"],
          paginacao: { pagina: 1, quantidade: 1 },
        };

        const searchParams = new URLSearchParams();
        searchParams.append("key", apiKey);
        searchParams.append("pesquisa", JSON.stringify(testPayload));

        const res = await fetch(`${apiUrl}/imoveis/listar?${searchParams.toString()}`, {
          method: "GET",
          headers: { Accept: "application/json" },
        });

        if (!res.ok) {
          const text = await res.text();
          return new Response(
            JSON.stringify({ success: false, error: `API returned ${res.status}: ${text}` }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const data = await res.json();
        return new Response(
          JSON.stringify({ success: true, message: "Conexão válida", sample: data }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (e) {
        return new Response(
          JSON.stringify({ success: false, error: `Connection failed: ${(e as Error).message}` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ---- SYNC MODE ----
    if (action === "sync") {
      const fields = [
        "Codigo", "Categoria", "Status", "Finalidade",
        "ValorVenda", "ValorLocacao", "Dormitorios", "Suites",
        "BanheiroSocialQtd", "Vagas", "AreaPrivativa", "AreaTotal",
        "Endereco", "Numero", "Complemento", "Bairro", "Cidade", "UF", "CEP",
        "DescricaoWeb",
        "FotoDestaque",
        "Latitude", "Longitude",
        "ValorCondominio", "AnoConstrucao",
        "TituloSite",
      ];

      let page = 1;
      const perPage = 50;
      let totalSynced = 0;
      let totalSkipped = 0;
      let hasMore = true;
      const errors: string[] = [];
      const foundStatuses = new Set<string>();

      while (hasMore) {
        const payload = {
          fields,
          paginacao: { pagina: page, quantidade: perPage },
        };

        const searchParams = new URLSearchParams();
        searchParams.append("key", apiKey);
        searchParams.append("pesquisa", JSON.stringify(payload));
        if (integration.import_inactive) {
          searchParams.append("showSuspended", "1");
        }

        let res: Response;
        try {
          res = await fetch(`${apiUrl}/imoveis/listar?${searchParams.toString()}`, {
            method: "GET",
            headers: { Accept: "application/json" },
          });
        } catch (e) {
          errors.push(`Fetch error page ${page}: ${(e as Error).message}`);
          break;
        }

        if (!res.ok) {
          const errText = await res.text();
          console.error(`API error page ${page}: ${res.status} - ${errText}`);
          errors.push(`API error page ${page}: ${res.status} - ${errText}`);
          break;
        }

        const data = await res.json();
        console.log(`Page ${page} response keys:`, Object.keys(data), `Total items found:`, Object.values(data).filter((v: any) => v && typeof v === "object" && v.Codigo).length);

        // Vista returns object with numeric keys, or empty
        const items = Object.values(data).filter(
          (v: any) => v && typeof v === "object" && v.Codigo
        );

        if (items.length === 0) {
          hasMore = false;
          break;
        }

        // For each property, fetch photos
        for (const item of items as any[]) {
          try {
            const codigo = String(item.Codigo);

            // Improved status check
            const itemStatus = String(item.Status || "").trim();
            foundStatuses.add(itemStatus);
            // Relaxed check: Import everything for now to debug
            const isAtivo = true;

            // Skip inactive if not importing
            if (!integration.import_inactive && !isAtivo) {
              totalSkipped++;
              continue;
            }

            // To prevent Edge Function timeouts, we rely on FotoDestaque provided in the listing
            // instead of fetching the details of every single property sequentially.
            let fotos: string[] = [];
            let imagemPrincipal = "";

            if (item.FotoDestaque && typeof item.FotoDestaque === "string" && item.FotoDestaque.startsWith("http")) {
              imagemPrincipal = item.FotoDestaque;
              fotos.push(item.FotoDestaque);
            }

            // Map Vista finalidade to our tipo_de_negocio
            let tipoNegocio = "Venda";
            const finalidade = String(item.Finalidade || "").toLowerCase();
            if (finalidade.includes("locac") || finalidade.includes("alugu")) {
              tipoNegocio = "Aluguel";
            } else if (finalidade.includes("venda") && finalidade.includes("locac")) {
              tipoNegocio = "Venda e Aluguel";
            }

            // Determine price
            let preco: number | null = null;
            if (tipoNegocio === "Aluguel") {
              preco = parseFloat(String(item.ValorLocacao || "0").replace(/[^\d.,]/g, "").replace(",", ".")) || null;
            }
            if (!preco) {
              preco = parseFloat(String(item.ValorVenda || "0").replace(/[^\d.,]/g, "").replace(",", ".")) || null;
            }

            // Map status
            let status = "ativo";
            const vistaStatus = String(item.Status || "").toLowerCase();
            if (vistaStatus.includes("inativ") || vistaStatus.includes("suspend")) {
              status = "inativo";
            } else if (vistaStatus.includes("vendid") || vistaStatus.includes("locad")) {
              status = "vendido";
            }

            const propertyData = {
              organization_id,
              vista_codigo: codigo,
              title: item.TituloSite || item.Categoria || `Imóvel ${codigo}`,
              tipo_de_imovel: item.Categoria || "Outro",
              tipo_de_negocio: tipoNegocio,
              status,
              endereco: item.Endereco || null,
              numero: item.Numero || null,
              complemento: item.Complemento || null,
              bairro: item.Bairro || null,
              cidade: item.Cidade || null,
              uf: item.UF || null,
              cep: item.CEP || null,
              quartos: parseInt(item.Dormitorios) || null,
              suites: parseInt(item.Suites) || null,
              banheiros: parseInt(item.BanheiroSocialQtd) || null,
              vagas: parseInt(item.Vagas) || null,
              area_util: parseFloat(item.AreaPrivativa) || null,
              area_total: parseFloat(item.AreaTotal) || null,
              preco,
              condominio: parseFloat(String(item.ValorCondominio || "0").replace(/[^\d.,]/g, "").replace(",", ".")) || null,
              iptu: null,
              ano_construcao: parseInt(item.AnoConstrucao) || null,
              descricao: item.DescricaoWeb || null,
              imagem_principal: imagemPrincipal || null,
              fotos,
              latitude: parseFloat(item.Latitude) || null,
              longitude: parseFloat(item.Longitude) || null,
            };

            // Check if property exists first to avoid constraint error
            const { data: existing, error: checkError } = await supabase
              .from("properties")
              .select("id")
              .eq("organization_id", organization_id)
              .eq("vista_codigo", codigo)
              .maybeSingle();

            let upsertError;

            if (existing) {
              const { error } = await supabase
                .from("properties")
                .update(propertyData)
                .eq("id", existing.id);
              upsertError = error;
            } else {
              const { error } = await supabase
                .from("properties")
                .insert([propertyData]);
              upsertError = error;
            }

            if (upsertError) {
              errors.push(`Upsert error for ${codigo}: ${upsertError.message}`);
            } else {
              totalSynced++;
            }
          } catch (e) {
            console.error(`Process error for item:`, (e as Error).message);
            errors.push(`Process error: ${(e as Error).message}`);
          }
        }

        if (items.length < perPage) {
          hasMore = false;
        } else {
          page++;
        }
      }

      // Update integration stats
      await supabase
        .from("vista_integrations")
        .update({
          last_sync_at: new Date().toISOString(),
          total_synced: totalSynced,
          sync_log: { last_run: new Date().toISOString(), synced: totalSynced, skipped: totalSkipped, errors: errors.slice(0, 20) },
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", organization_id);

      return new Response(
        JSON.stringify({
          success: true,
          synced: totalSynced,
          skipped: totalSkipped,
          errors: errors.slice(0, 10),
          debug_sample_keys: errors.length > 0 ? null : "No items found in response root",
          found_statuses: Array.from(foundStatuses),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
