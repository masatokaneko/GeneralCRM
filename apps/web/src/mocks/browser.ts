import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

// Setup MSW browser worker
export const worker = setupWorker(...handlers);

// Initialize MSW
export async function initMsw() {
  if (typeof window === "undefined") {
    return;
  }

  // Only start in development
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  await worker.start({
    onUnhandledRequest: "bypass", // Don't warn about unhandled requests
    serviceWorker: {
      url: "/mockServiceWorker.js",
    },
  });

  console.log("[MSW] Mock Service Worker started");
}
