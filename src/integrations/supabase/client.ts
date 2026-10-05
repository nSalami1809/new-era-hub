import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    // New Supabase API keys are opaque strings, not bearer JWTs.
    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function createSupabaseClient() {
  // Use import.meta.env for client-side (Vite build-time replacement)
  // Fall back to process.env for SSR (server-side rendering)
  //
  // Bracket access (import.meta.env["VITE_X"]) is NOT statically replaced by
  // Vite's production build — only the dot-notation form is. Bracket access
  // silently evaluates to undefined in the browser bundle, so this must stay
  // dot-notation even though the keys are otherwise dynamic-looking.
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || process.env["SUPABASE_URL"];
  const SUPABASE_PUBLISHABLE_KEY =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env["SUPABASE_PUBLISHABLE_KEY"];

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ["SUPABASE_URL"] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ["SUPABASE_PUBLISHABLE_KEY"] : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(", ")}. Set them in your .env file (see .env.example).`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
    },
    // postgrest-js's own request layer (used by every .from()/.rpc() call —
    // all product/order/stock/promo-code/etc. reads and writes in this app).
    // `timeout` wraps each individual attempt in an AbortController so a
    // hung request fails after 15s instead of indefinitely. `retry` (true is
    // already postgrest-js's own default when unset — stated explicitly here
    // so the intent isn't implicit) retries ONLY GET/HEAD/OPTIONS on a
    // network error or a 503/520 response, with exponential backoff; POST/
    // PATCH/DELETE (every write, including RPC calls like create_order) and
    // any 4xx are never retried, so a flaky connection can't double-submit a
    // write. A failure here still resolves as the normal { data: null, error
    // } shape every existing call site already checks (`if (error) throw
    // error`) — nothing needed to change at the call sites. Verified against
    // the live project: a 1ms timeout surfaces a clear, non-swallowed
    // AbortError; a simulated network failure on a GET is retried and
    // recovers; the same failure on an RPC is not retried.
    db: {
      timeout: 15000,
      retry: true,
    },
    auth: {
      storage: typeof window === "undefined" ? undefined : window.localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
