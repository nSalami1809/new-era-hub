// Proxies a single product photo to Leonardo.AI's "remove-bg" model, so the
// API key (LEONARDO_API_KEY, set as an Edge Function secret) never reaches
// the browser. Admin-only: verifies the caller's JWT and is_admin() before
// spending a credit. Always asks Leonardo for a plain transparent cutout
// (no crop/shadow/bg_color) — the client composites onto white with its own
// shadow, so the final look stays identical regardless of provider.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { encodeBase64 } from "jsr:@std/encoding/base64";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonError("Méthode non autorisée.", 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonError("Non authentifié.", 401);
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return jsonError("Non authentifié.", 401);
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return jsonError("Accès refusé.", 403);
  }

  const apiKey = Deno.env.get("LEONARDO_API_KEY");
  if (!apiKey) {
    return jsonError("Service de détourage non configuré (clé API manquante).", 500);
  }

  let incomingForm: FormData;
  try {
    incomingForm = await req.formData();
  } catch {
    return jsonError("Requête invalide.", 400);
  }
  const file = incomingForm.get("image_file");
  if (!(file instanceof File)) {
    return jsonError("Image manquante.", 400);
  }

  const fileBytes = new Uint8Array(await file.arrayBuffer());
  const base64Data = encodeBase64(fileBytes);

  let genResponse: Response;
  try {
    genResponse = await fetch("https://cloud.leonardo.ai/api/rest/v2/generationssync", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        model: "remove-bg",
        public: false,
        ephemeral: true,
        parameters: {
          size: "auto",
          type: "product",
          format: "png",
          guidances: {
            image_reference: [{ image: { type: "BASE64", data: base64Data } }],
          },
        },
      }),
    });
  } catch (err) {
    console.error("leonardo fetch failed", err);
    return jsonError("Le service de détourage est injoignable.", 502);
  }

  if (!genResponse.ok) {
    const errText = await genResponse.text();
    console.error("leonardo error", genResponse.status, errText);
    const message =
      genResponse.status === 402
        ? "Crédits Leonardo.AI épuisés."
        : genResponse.status === 401 || genResponse.status === 403
          ? "Clé API Leonardo.AI invalide."
          : "Le détourage a échoué.";
    return jsonError(message, 502);
  }

  const genJson = (await genResponse.json()) as {
    results?: { url?: string }[];
  };
  const resultUrl = genJson.results?.[0]?.url;
  if (!resultUrl) {
    return jsonError("Aucun résultat de détourage.", 502);
  }

  let imgResponse: Response;
  try {
    imgResponse = await fetch(resultUrl);
  } catch (err) {
    console.error("leonardo result fetch failed", err);
    return jsonError("Le service de détourage est injoignable.", 502);
  }
  if (!imgResponse.ok) {
    return jsonError("Le détourage a échoué.", 502);
  }

  const resultBytes = await imgResponse.arrayBuffer();
  return new Response(resultBytes, {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "image/png" },
  });
});
