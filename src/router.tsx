import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  // Without these, React Query's default staleTime of 0 means every route
  // change re-fetches products/settings/categories from scratch even when
  // they were just fetched a moment ago on the previous page — every
  // navigation shows a loading skeleton instead of the already-known data.
  // Writes (create_order, adjust_stock, cancel_order, ...) already call
  // invalidateQueries explicitly, so staying "stale" in the background here
  // never hides a real change; it only skips pointless refetches of data
  // that hasn't been touched.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 10 * 60_000,
        refetchOnWindowFocus: false,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Starts fetching a route's JS chunk as soon as the user hovers/touches
    // a <Link> — with these small per-route chunks, the click then just
    // renders already-downloaded code instead of waiting on a fetch.
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
  });

  // Without this, useQuery() has no data during SSR (nothing has been
  // fetched into this fresh queryClient yet), so the server ships skeleton
  // HTML for every page and real content only appears after the client
  // re-fetches post-hydration — a full extra round trip to Supabase on
  // every load. This wires route loaders' ensureQueryData() calls to
  // dehydrate into the SSR payload and rehydrate client-side automatically,
  // so a route that prefetches its data (see e.g. routes/index.tsx) renders
  // real content on the very first response.
  setupRouterSsrQueryIntegration({ router, queryClient });

  return router;
};
