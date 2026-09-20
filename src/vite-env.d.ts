/// <reference types="vite/client" />

// Named (not index-signature) declarations so these keys can be accessed
// via dot notation — required for Vite to statically inline them at build
// time (see src/integrations/supabase/client.ts).
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_SUPABASE_PROJECT_ID?: string;
}
