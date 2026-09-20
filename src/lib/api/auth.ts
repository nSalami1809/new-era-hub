import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return { session, loading };
}

export async function signInAdmin(email: string, password: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? error.message : null;
}

export async function signOutAdmin() {
  await supabase.auth.signOut();
}

export async function requestPasswordReset(email: string): Promise<string | null> {
  const options =
    typeof window !== "undefined"
      ? { redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe` }
      : undefined;
  const { error } = await supabase.auth.resetPasswordForEmail(email, options);
  return error ? error.message : null;
}

export async function updatePassword(password: string): Promise<string | null> {
  const { error } = await supabase.auth.updateUser({ password });
  return error ? error.message : null;
}

/**
 * Session existing just means "logged in" — it does not mean "admin". The
 * real gate is server-side (RLS via is_admin()); this hook only mirrors it
 * client-side so the UI can show the right screen instead of a wall of
 * failed requests.
 */
export function useIsAdmin() {
  const { session, loading: sessionLoading } = useSession();
  const { data: isAdmin, isLoading: roleLoading } = useQuery({
    queryKey: ["is-admin", session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_admin");
      if (error) throw error;
      return !!data;
    },
    enabled: !!session,
  });

  return {
    session,
    isAdmin: !!session && !!isAdmin,
    loading: sessionLoading || (!!session && roleLoading),
  };
}
