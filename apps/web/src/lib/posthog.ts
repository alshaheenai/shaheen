import "server-only";
import { PostHog } from "posthog-node";

let _client: PostHog | undefined;

export function getPostHogClient(): PostHog {
  if (!_client) {
    _client = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      enableExceptionAutocapture: true,
    });
  }
  return _client;
}
