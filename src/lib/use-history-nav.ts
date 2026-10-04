import { useEffect, useRef, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import type { RouterHistory } from "@tanstack/history";

/**
 * Tracks whether the browser-history back/forward actions have anywhere to
 * go, so a custom "previous/next page" control can disable itself instead of
 * silently doing nothing. Drives off the same history object TanStack
 * Router already uses — `history.length` is the whole browser session
 * (other sites included), so forward-availability is tracked ourselves:
 * only a PUSH (a genuinely new page) truncates the forward stack, same rule
 * real browsers follow.
 */
type HistorySubscriberArgs = Parameters<Parameters<RouterHistory["subscribe"]>[0]>[0];

export function useHistoryNav() {
  const router = useRouter();
  const history = router.history;
  const [canGoBack, setCanGoBack] = useState(() => history.canGoBack());
  const [canGoForward, setCanGoForward] = useState(false);
  const maxIndex = useRef(history.location.state.__TSR_index);

  useEffect(() => {
    return history.subscribe(({ location, action }: HistorySubscriberArgs) => {
      const index = location.state.__TSR_index;
      maxIndex.current = action.type === "PUSH" ? index : Math.max(maxIndex.current, index);
      setCanGoBack(history.canGoBack());
      setCanGoForward(index < maxIndex.current);
    });
  }, [history]);

  return {
    canGoBack,
    canGoForward,
    goBack: () => history.back(),
    goForward: () => history.forward(),
  };
}
