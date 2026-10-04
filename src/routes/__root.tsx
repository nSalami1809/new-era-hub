import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import appCss from "../styles.css?url";

// Every product photo (and its resized/transformed variants, see
// lib/image-transform.ts) is served from this origin — a plain <img src>
// only starts the DNS/TLS/connection handshake once the browser parses it,
// but a preconnect hint lets that happen in parallel with the rest of the
// page instead of in series in front of every image fetch.
const SUPABASE_ORIGIN = (() => {
  const url = import.meta.env.VITE_SUPABASE_URL || process.env["SUPABASE_URL"];
  try {
    return url ? new URL(url).origin : null;
  } catch {
    return null;
  }
})();

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          New Era Hub 241
        </p>
        <h1 className="mt-3 text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page introuvable</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La page que vous cherchez n'existe pas ou a été déplacée.
        </p>
        <div className="mt-6">
          <Link to="/" className="btn-base btn-dark">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          New Era Hub 241
        </p>
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-foreground">
          Cette page n'a pas pu se charger
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Une erreur est survenue de notre côté. Réessayez ou retournez à l'accueil.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="btn-base btn-dark"
          >
            Réessayer
          </button>
          <a href="/" className="btn-base btn-outline">
            Retour à l'accueil
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "New Era Hub 241" },
      {
        name: "description",
        content:
          "New Era Hub 241 : boutique en ligne — casquettes, vêtements, chaussures, accessoires. Commande en ligne, paiement finalisé sur WhatsApp.",
      },
      { name: "author", content: "New Era Hub 241" },
      { property: "og:title", content: "New Era Hub 241" },
      {
        property: "og:description",
        content:
          "Boutique en ligne — casquettes, vêtements, chaussures, accessoires. Commande en ligne, paiement finalisé sur WhatsApp.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/brand/logo.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "preload",
        href: "/fonts/ranade-400.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      ...(SUPABASE_ORIGIN
        ? [{ rel: "preconnect", href: SUPABASE_ORIGIN, crossOrigin: "anonymous" as const }]
        : []),
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/brand/logo.jpg?v=2", type: "image/jpeg" },
      { rel: "apple-touch-icon", href: "/brand/logo.jpg?v=2" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
