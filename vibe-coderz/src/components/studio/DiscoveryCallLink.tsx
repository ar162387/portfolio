"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { trackEvent } from "./Analytics";

// This is the same event used by voice-agent's CAL_USERNAME / CAL_EVENT_TYPE_SLUG.
const calLink = "syed-shah-abdur-rehman/free-discovery-call";
const bookingUrl = `https://cal.com/${calLink}`;

async function openDiscoveryCalendar() {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const { getCalApi } = await import("@calcom/embed-react");
    const cal = await Promise.race([
      getCalApi({ namespace: "discovery-call" }),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Calendar load timeout")), 10000);
      }),
    ]);
    cal("modal", {
      calLink,
      config: {
        layout: "month_view",
        theme: document.documentElement.dataset.theme === "dark" ? "dark" : "light",
      },
    });
    trackEvent("discovery_calendar_opened");
  } catch {
    window.location.assign(bookingUrl);
  } finally {
    clearTimeout(timeout);
  }
}

/** Legacy contact links land on the homepage and open the same booking modal. */
export function DiscoveryCallAutoOpen() {
  useEffect(() => {
    function openFromHash() {
      if (window.location.hash !== "#book-call") return;
      // Consume the marker before loading so hydration/re-renders cannot reopen it.
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      void openDiscoveryCalendar();
    }
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, []);
  return null;
}

export function DiscoveryCallLink({
  children,
  onClick,
  ...props
}: Omit<ComponentProps<"a">, "href">) {
  const [loading, setLoading] = useState(false);

  return (
    <a
      {...props}
      href={bookingUrl}
      aria-haspopup="dialog"
      aria-busy={loading}
      onClick={async (event) => {
        onClick?.(event);
        if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        if (loading) return;
        setLoading(true);
        try {
          await openDiscoveryCalendar();
        } finally {
          setLoading(false);
        }
      }}
    >
      {children}
    </a>
  );
}
