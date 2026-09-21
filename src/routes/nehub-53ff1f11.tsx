import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import {
  LogOut,
  Eye,
  EyeOff,
  Menu,
  X,
  ArrowLeft,
  LayoutDashboard,
  Package,
  Archive,
  Tag,
  Tags,
  ClipboardList,
  Settings,
  Star,
  Ticket,
} from "lucide-react";
import { useIsAdmin, signInAdmin, signOutAdmin, requestPasswordReset } from "@/lib/api/auth";
import { useSettings } from "@/lib/api/settings";
import { Toaster } from "@/components/Toaster";
import { toast } from "@/lib/toast";
import logo from "@/assets/logo-new-era-hub-241.jpeg";

export const Route = createFileRoute("/nehub-53ff1f11")({
  head: () => ({
    meta: [
      { title: "Administration | New Era Hub 241" },
      {
        name: "description",
        content: "Espace administrateur : produits, stocks, commandes et paramètres.",
      },
      { property: "og:title", content: "Administration | New Era Hub 241" },
      { property: "og:description", content: "Gestion du catalogue, des stocks et des commandes." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminLayout,
});

const ADMIN_ROOT = "/nehub-53ff1f11";

const NAV: { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] = [
  { to: ADMIN_ROOT, label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { to: `${ADMIN_ROOT}/produits`, label: "Produits", icon: Package },
  { to: `${ADMIN_ROOT}/categories`, label: "Catégories", icon: Tags },
  { to: `${ADMIN_ROOT}/stocks`, label: "Stocks", icon: Archive },
  { to: `${ADMIN_ROOT}/promotions`, label: "Promotions", icon: Tag },
  { to: `${ADMIN_ROOT}/codes-promo`, label: "Codes promo", icon: Ticket },
  { to: `${ADMIN_ROOT}/commandes`, label: "Commandes", icon: ClipboardList },
  { to: `${ADMIN_ROOT}/avis`, label: "Avis", icon: Star },
  { to: `${ADMIN_ROOT}/parametres`, label: "Paramètres", icon: Settings },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { data: settings } = useSettings();
  return (
    <>
      <Link
        to={ADMIN_ROOT}
        onClick={onNavigate}
        className="flex h-16 shrink-0 items-center gap-2.5 border-b border-border px-5"
      >
        <img src={settings?.logoUrl ?? logo} alt="" className="h-8 w-8 object-contain" />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold leading-tight">
            {settings?.storeName ?? "New Era Hub 241"}
          </p>
          <p className="text-xs text-muted-foreground">Administration</p>
        </div>
      </Link>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {NAV.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              activeOptions={{ exact: item.exact ?? false }}
              activeProps={{ className: "bg-foreground text-background" }}
              className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Icon size={16} className="shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-0.5 border-t border-border p-3">
        <Link
          to="/"
          onClick={onNavigate}
          className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft size={15} className="shrink-0" />
          Voir le site
        </Link>
        <button
          type="button"
          onClick={() => void signOutAdmin()}
          className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10"
        >
          <LogOut size={15} className="shrink-0" />
          Déconnexion
        </button>
      </div>
    </>
  );
}

function AdminLayout() {
  const { session, isAdmin, loading } = useIsAdmin();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Chargement...
      </div>
    );
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
          <button
            type="button"
            onClick={() => void signOutAdmin()}
            className="btn-base btn-outline mt-4"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  const currentLabel = NAV.find((item) =>
    item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to),
  )?.label;

  return (
    <div className="flex min-h-screen bg-muted/40">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-background lg:flex">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fermer le menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-background">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Fermer le menu"
              className="absolute right-3 top-4 text-muted-foreground hover:text-foreground"
            >
              <X size={18} />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Ouvrir le menu"
            className="text-muted-foreground hover:text-foreground lg:hidden"
          >
            <Menu size={20} />
          </button>
          <nav aria-label="Fil d'Ariane" className="flex min-w-0 items-center gap-2 text-sm">
            <Link to={ADMIN_ROOT} className="shrink-0 text-muted-foreground hover:text-foreground">
              Admin
            </Link>
            {currentLabel && location.pathname !== ADMIN_ROOT && (
              <>
                <span className="text-border">/</span>
                <span className="truncate font-medium text-foreground">{currentLabel}</span>
              </>
            )}
          </nav>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
        <Toaster />
      </div>
    </div>
  );
}

function translateAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return "Email ou mot de passe incorrect.";
  if (/email not confirmed/i.test(message))
    return "Cet email n'a pas encore été confirmé. Vérifie ta boîte mail.";
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

  if (showReset)
    return <ResetRequestScreen onBack={() => setShowReset(false)} initialEmail={email} />;

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
            className="mb-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
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
        <Link
          to="/"
          className="mt-4 block text-center text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          Retour à la boutique
        </Link>
      </form>
    </div>
  );
}

function ResetRequestScreen({
  onBack,
  initialEmail,
}: {
  onBack: () => void;
  initialEmail: string;
}) {
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
            Si un compte existe pour <strong>{email}</strong>, un lien de réinitialisation vient
            d'être envoyé. Vérifie ta boîte mail (et les spams).
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
            <button
              type="submit"
              disabled={submitting}
              className="btn-base btn-success mt-4 w-full"
            >
              Envoyer le lien
            </button>
          </>
        )}
        <button
          type="button"
          onClick={onBack}
          className="mt-4 block w-full text-center text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          ← Retour à la connexion
        </button>
      </form>
    </div>
  );
}
