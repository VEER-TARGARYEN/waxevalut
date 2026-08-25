import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import App from "./App";
import "./styles/index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A free-tier backend cold-starts (~50s) on the first request after idle, returning
      // 503s until it wakes. Retry a few times with exponential backoff so the first recall
      // succeeds on its own instead of showing an error — the connection dot shows
      // "Reconnecting" meanwhile. (Harmless on mock, which never fails.)
      retry: 3,
      retryDelay: (attempt) => Math.min(1500 * 2 ** attempt, 8000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      staleTime: 10_000,
    },
    mutations: {
      // Never auto-retry writes — a retried /observe could double-insert a fact.
      retry: 0,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* reducedMotion="user" makes every framer animation honor the OS setting globally */}
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </MotionConfig>
    </QueryClientProvider>
  </StrictMode>,
);
