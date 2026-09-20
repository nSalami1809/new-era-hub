import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useState } from "react";
import { LogOut, Eye, EyeOff } from "lucide-react";
import { useIsAdmin, signInAdmin, signOutAdmin, requestPasswordReset } from "@/lib/api/auth";
import { useSettings } from "@/lib/api/settings";
import { Toaster } from "@/components/Toaster";
import { toast } from "@/lib/toast";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administration | New Era Hub 241" },
      { name: "description", content: "Espace administrateur : produits, stocks, commandes et paramètres." },
      { property: "og:title", content: "Administration | New Era Hub 241" },
      { property: "og:description", content: "Gestion du catalogue, des stocks et des commandes." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminLayout,
});

const NAV: { to: string; label: string; exact?: boolean }[] = [
  { to: "/admin", label: "Tableau de bord", exact: true },
  { to: "/admin/produits", label: "Produits" },
  { to: "/admin/stocks", label: "Stocks" },
  { to: "/admin/promotions", label: "Promotions" },
  { to: "/admin/commandes", label: "Commandes" },
  { to: "/admin/parametres", label: "Paramètres" },
];

function AdminLayout() {
  const { session, isAdmin, loading } = useIsAdmin();
  const { data: settings } = useSettings();

  if (loading) {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Chargement...</div>;
  }

  if (!session) return <LoginScreen />;

  if (!isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <div>
          <h1 className="text-xl">Accès refusé</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ce compte est connecté mais n'a pas les droits administrateur.
          </p>
          <button type="button" onClick={() => void signOutAdmin()} className="btn-base btn-outline mt-4">
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container-page flex h-16 items-center gap-4">
          <Link to="/admin" className="font-bold">
            {settings?.storeName ?? "New Era Hub 241"} · Admin
          </Link>
          <Link to="/" className="ml-auto text-sm underline">
            Voir le site
          </Link>
          <button
            type="button"
            onClick={() => void signOutAdmin()}
            className="btn-base btn-outline !min-h-9 !px-3 !py-1.5 text-sm"
          >
            <LogOut size={15} />
            Déconnexion
          </button>
        </div>
        <nav className="container-page flex gap-1 overflow-x-auto pb-2">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact ?? false }}
              activeProps={{ className: "bg-foreground text-background" }}
              className="whitespace-nowrap rounded-sm border border-border px-3 py-1.5 text-sm font-medium"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="container-page py-8">
        <Outlet />
      </main>
      <Toaster />
    </div>
  );
}

function translateAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return "Email ou mot de passe incorrect.";
  if (/email not confirmed/i.test(message)) return "Cet email n'a pas encore été confirmé. Vérifie ta boîte mail.";
  if (/rate limit/i.test(message)) return "Trop de tentatives. Réessaie dans quelques minutes.";
  return message;
}

function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showReset, setShowReset] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const message = await signInAdmin(email, password);
    setSubmitting(false);
    setError(message ? translateAuthError(message) : "");
  }

  if (showReset) return <ResetRequestScreen onBack={() => setShowReset(false)} initialEmail={email} />;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form className="w-full max-w-sm border border-border p-6" onSubmit={submit}>
        <h1 className="text-xl">Espace administrateur</h1>
        <p className="mt-1 text-sm text-muted-foreground">Connectez-vous pour gérer la boutique.</p>
        <label htmlFor="admin-email" className="mt-5 mb-1 block text-sm font-medium">
          Email
        </label>
        <input
          id="admin-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field"
          required
        />
        <div className="mt-4 flex items-baseline justify-between">
          <label htmlFor="admin-password" className="mb-1 block text-sm font-medium">
            Mot de passe
          </label>
          <button
            type="button"
            onClick={() => setShowReset(true)}
            className="mb-1 text-xs text-muted-foreground underline"
          >
            Mot de passe oublié ?
          </button>
        </div>
        <div className="relative">
          <input
            id="admin-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`field pr-10 ${error ? "border-destructive" : ""}`}
            aria-invalid={!!error}
            required
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
        {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
        <button type="submit" disabled={submitting} className="btn-base btn-success mt-4 w-full">
          Se connecter
        </button>
        <Link to="/" className="mt-4 block text-center text-sm underline">
          Retour à la boutique
        </Link>
      </form>
    </div>
  );
}

function ResetRequestScreen({ onBack, initialEmail }: { onBack: () => void; initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const message = await requestPasswordReset(email);
    setSubmitting(false);
    if (message) {
      setError(translateAuthError(message));
      return;
    }
    setError("");
    setSent(true);
    toast("Email de réinitialisation envoyé.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form className="w-full max-w-sm border border-border p-6" onSubmit={submit}>
        <h1 className="text-xl">Mot de passe oublié</h1>
        {sent ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Si un compte existe pour <strong>{email}</strong>, un lien de réinitialisation vient d'être envoyé.
            Vérifie ta boîte mail (et les spams).
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              Renseigne ton email, tu recevras un lien pour choisir un nouveau mot de passe.
            </p>
            <label htmlFor="reset-email" className="mt-5 mb-1 block text-sm font-medium">
              Email
            </label>
            <input
              id="reset-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`field ${error ? "border-destructive" : ""}`}
              required
            />
            {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
            <button type="submit" disabled={submitting} className="btn-base btn-success mt-4 w-full">
              Envoyer le lien
            </button>
          </>
        )}
        <button type="button" onClick={onBack} className="mt-4 block w-full text-center text-sm underline">
          ← Retour à la connexion
        </button>
      </form>
    </div>
  );
}
