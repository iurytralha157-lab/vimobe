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

    const apiUrl = integration.api_url.replace(/\/+$/, "");
    const apiKey = integration.api_key;

    // ---- TEST MODE ----
    if (action === "test") {
      try {
        const testPayload = {
          fields: ["Codigo"],
          ppimovel: "1",
          pesquisa: { paginacao: { pagina: 1, quantidade: 1 } },
        };

        const res = await fetch(`${apiUrl}/imoveis/listar?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(testPayload),
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
          JSON.stringify({ success: false, error: `Connection failed: ${e.message}` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ---- SYNC MODE ----
    if (action === "sync") {
      const fields = [
        "Codigo", "Categoria", "Status", "Finalidade",
        "ValorVenda", "ValorLocacao", "Dormitorio", "Suite",
        "BanheiroSocialQtd", "Vagas", "AreaUtil", "AreaTotal",
        "Endereco", "Numero", "Complemento", "Bairro", "Cidade", "UF", "CEP",
        "Descricao", "DescricaWeb",
        "FotoDestaque", "FotoDestaqueEmpreworking",
        "Latitude", "Longitude",
        "Condominio", "IPTU", "AnoConstrucao", "Andar",
        "TituloSite",
      ];

      let page = 1;
      const perPage = 50;
      let totalSynced = 0;
      let totalSkipped = 0;
      let hasMore = true;
      const errors: string[] = [];

      while (hasMore) {
        const payload = {
          fields,
          ppimovel: "1",
          pesquisa: {
            paginacao: { pagina: page, quantidade: perPage },
            ...(integration.import_inactive ? {} : { condicao: "E", campos: [{ campo: "Status", valor: "Ativo", tipo: "igual" }] }),
          },
        };

        let res: Response;
        try {
          res = await fetch(`${apiUrl}/imoveis/listar?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify(payload),
          });
        } catch (e) {
          errors.push(`Fetch error page ${page}: ${e.message}`);
          break;
        }

        if (!res.ok) {
          errors.push(`API error page ${page}: ${res.status}`);
          break;
        }

        const data = await res.json();

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

            // Skip inactive if not importing
            if (!integration.import_inactive && item.Status && item.Status !== "Ativo") {
              totalSkipped++;
              continue;
            }

            // Fetch photos for this property
            let fotos: string[] = [];
            let imagemPrincipal = "";
            try {
              const fotosRes = await fetch(
                `${apiUrl}/imoveis/detalhes?key=${apiKey}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Accept: "application/json" },
                  body: JSON.stringify({
                    imovel: codigo,
                    fields: ["Foto"],
                    pesquisa: { fotos: { quantidade: 20 } },
                  }),
                }
              );
              if (fotosRes.ok) {
                const fotosData = await fotosRes.json();
                // Extract photo URLs from Vista response
                if (fotosData && typeof fotosData === "object") {
                  const fotosObj = fotosData.Fotos || fotosData.fotos || {};
                  const fotoEntries = Object.values(fotosObj).filter(
                    (f: any) => f && typeof f === "object" && (f.Foto || f.FotoPequena)
                  );
                  fotos = fotoEntries.map((f: any) => f.Foto || f.FotoPequena).filter(Boolean);
                }
              }
            } catch {
              // Photos fetch failed, continue without photos
            }

            // Use FotoDestaque as main image, fallback to first photo
            if (item.FotoDestaque && typeof item.FotoDestaque === "string" && item.FotoDestaque.startsWith("http")) {
              imagemPrincipal = item.FotoDestaque;
            } else if (fotos.length > 0) {
              imagemPrincipal = fotos[0];
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
              quartos: parseInt(item.Dormitorio) || null,
              suites: parseInt(item.Suite) || null,
              banheiros: parseInt(item.BanheiroSocialQtd) || null,
              vagas: parseInt(item.Vagas) || null,
              area_util: parseFloat(item.AreaUtil) || null,
              area_total: parseFloat(item.AreaTotal) || null,
              preco,
              condominio: parseFloat(String(item.Condominio || "0").replace(/[^\d.,]/g, "").replace(",", ".")) || null,
              iptu: parseFloat(String(item.IPTU || "0").replace(/[^\d.,]/g, "").replace(",", ".")) || null,
              ano_construcao: parseInt(item.AnoConstrucao) || null,
              andar: parseInt(item.Andar) || null,
              descricao: item.DescricaWeb || item.Descricao || null,
              imagem_principal: imagemPrincipal || null,
              fotos,
              latitude: parseFloat(item.Latitude) || null,
              longitude: parseFloat(item.Longitude) || null,
            };

            // Upsert using vista_codigo + organization_id
            const { error: upsertError } = await supabase
              .from("properties")
              .upsert(propertyData, {
                onConflict: "organization_id,vista_codigo",
                ignoreDuplicates: false,
              });

            if (upsertError) {
              errors.push(`Upsert error for ${codigo}: ${upsertError.message}`);
            } else {
              totalSynced++;
            }
          } catch (e) {
            errors.push(`Process error: ${e.message}`);
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
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
