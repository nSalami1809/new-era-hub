// Proxies a single product photo to the remove.bg API, so the API key
// (REMOVE_BG_API_KEY, set as an Edge Function secret) never reaches the
// browser. Admin-only: verifies the caller's JWT and is_admin() before
// spending a remove.bg credit.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

  const apiKey = Deno.env.get("REMOVE_BG_API_KEY");
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

  const outgoingForm = new FormData();
  outgoingForm.append("image_file", file, file.name);
  outgoingForm.append("size", "auto");

  let rbResponse: Response;
  try {
    rbResponse = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: { "X-Api-Key": apiKey },
      body: outgoingForm,
    });
  } catch (err) {
    console.error("remove.bg fetch failed", err);
    return jsonError("Le service de détourage est injoignable.", 502);
  }

  if (!rbResponse.ok) {
    const errText = await rbResponse.text();
    console.error("remove.bg error", rbResponse.status, errText);
    const message =
      rbResponse.status === 402
        ? "Crédits remove.bg épuisés."
        : rbResponse.status === 403
          ? "Clé API remove.bg invalide."
          : "Le détourage a échoué.";
    return jsonError(message, 502);
  }

  const resultBytes = await rbResponse.arrayBuffer();
  return new Response(resultBytes, {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "image/png" },
  });
});
