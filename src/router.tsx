import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
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

  return router;
};
