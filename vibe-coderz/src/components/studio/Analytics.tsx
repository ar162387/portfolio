"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const measurementId = "G-F2ZSD4EL60";
const consentKey = "vibecoderzz_analytics_consent";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(name: string, parameters: Record<string, string> = {}) {
  window.gtag?.("event", name, parameters);
}

export function Analytics() {
  const pathname = usePathname();
  const [consent, setConsent] = useState<"granted" | "denied" | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const savedConsent = window.localStorage.getItem(consentKey);
    const restoreConsent = window.setTimeout(() => {
      if (savedConsent === "granted" || savedConsent === "denied") {
        setConsent(savedConsent);
      }
    }, 0);

    const openSettings = (event: MouseEvent) => {
      const link = (event.target as Element).closest('a[href="#cookie-settings"]');
      if (link) {
        event.preventDefault();
        setConsent(null);
      }
    };
    document.addEventListener("click", openSettings);
    return () => {
      window.clearTimeout(restoreConsent);
      document.removeEventListener("click", openSettings);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    trackEvent("page_view", {
      page_path: pathname,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname, ready]);

  useEffect(() => {
    if (!ready) return;
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element).closest<HTMLAnchorElement>("a[href]");
      if (!link) return;
      if (link.href.startsWith("mailto:")) {
        trackEvent("email_click", { link_location: window.location.pathname });
      } else if (link.getAttribute("href") === "/contact") {
        trackEvent("cta_contact_click", {
          link_text: link.textContent?.trim().slice(0, 100) || "Contact",
          link_location: window.location.pathname,
        });
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [ready]);

  const saveConsent = (value: "granted" | "denied") => {
    window.localStorage.setItem(consentKey, value);
    setConsent(value);
  };

  return (
    <>
      {consent === "granted" && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" onLoad={() => setReady(true)} />
          <Script id="google-analytics" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${measurementId}', { send_page_view: false });`}
          </Script>
        </>
      )}
      {consent === null && (
        <aside className="cookie-banner" aria-label="Cookie preferences">
          <p className="eyebrow">YOUR PRIVACY</p>
          <h2>Help us understand how the site is used.</h2>
          <p>With your permission, we use Google Analytics to measure visits, page views, and contact interest. You can change your choice at any time.</p>
          <div className="cookie-actions">
            <button className="cookie-reject" type="button" onClick={() => saveConsent("denied")}>Reject analytics</button>
            <button className="button orange-button" type="button" onClick={() => saveConsent("granted")}>Accept analytics</button>
          </div>
          <Link href="/privacy">Read our Privacy Policy</Link>
        </aside>
      )}
    </>
  );
}
