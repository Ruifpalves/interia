import { PostHog } from "posthog-node";

let cached: PostHog | null = null;

export function getPosthogServer(): PostHog | null {
  if (cached) return cached;
  const key = process.env.POSTHOG_PROJECT_KEY ?? process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  cached = new PostHog(key, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.posthog.com",
    flushAt: 1,
    flushInterval: 0,
  });
  return cached;
}

export async function trackEvent(args: {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
}) {
  const ph = getPosthogServer();
  if (!ph) return;
  ph.capture(args);
}
