import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { updatePassword } from "@/lib/api/auth";
import { toast } from "@/lib/toast";
import { Toaster } from "@/components/Toaster";

export const Route = createFileRoute("/reinitialiser-mot-de-passe")({
  head: () => ({
    meta: [
      { title: "Réinitialiser le mot de passe | New Era Hub 241" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Supabase auto-exchanges the recovery token in the URL hash on load and
    // fires this event once the temporary recovery session is ready.
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setSubmitting(true);
    const message = await updatePassword(password);
    setSubmitting(false);
    if (message) {
      setError(message);
      return;
    }
    toast("Mot de passe mis à jour.");
    navigate({ to: "/admin" });
  }

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <div>
          <h1 className="text-xl">Lien invalide ou expiré</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Redemande un lien de réinitialisation depuis l'écran de connexion.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form className="w-full max-w-sm border border-border p-6" onSubmit={submit}>
        <h1 className="text-xl">Nouveau mot de passe</h1>
        <p className="mt-1 text-sm text-muted-foreground">Choisis un nouveau mot de passe pour ton compte admin.</p>

        <label htmlFor="new-password" className="mt-5 mb-1 block text-sm font-medium">
          Nouveau mot de passe
        </label>
        <div className="relative">
          <input
            id="new-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field pr-10"
            required
            minLength={8}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>

        <label htmlFor="confirm-password" className="mt-4 mb-1 block text-sm font-medium">
          Confirmer le mot de passe
        </label>
        <input
          id="confirm-password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={`field ${error ? "border-destructive" : ""}`}
          required
          minLength={8}
        />
        {error && <p className="mt-1 text-sm text-destructive">{error}</p>}

        <button type="submit" disabled={submitting} className="btn-base btn-success mt-4 w-full">
          Enregistrer le nouveau mot de passe
        </button>
      </form>
      <Toaster />
    </div>
  );
}
