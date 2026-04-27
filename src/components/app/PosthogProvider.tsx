"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { usePathname, useSearchParams } from "next/navigation";

export function PosthogProvider() {
  const path = usePathname();
  const sp = useSearchParams();

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;
    if (typeof window === "undefined") return;
    if (!(posthog as unknown as { __initialized?: boolean }).__initialized) {
      posthog.init(key, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.posthog.com",
        capture_pageview: false,
        person_profiles: "identified_only",
      });
      (posthog as unknown as { __initialized?: boolean }).__initialized = true;
    }
  }, []);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || typeof window === "undefined") return;
    posthog.capture("$pageview", { $current_url: window.location.href });
  }, [path, sp]);

  return null;
}
