"use client";

import { useState } from "react";
import { isAxiosError } from "axios";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * @component QueryProvider
 * @description Holds one QueryClient per browser session and exposes it to the app (30s staleTime, no retry on 4xx).
 */
export const QueryProvider = ({ children }: { children: React.ReactNode }) => {
  // Created in state so the client isn't shared across server requests.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            // Client errors won't succeed on retry; only retry other failures, up to 3 times.
            retry: (failureCount, error) => {
              const status = isAxiosError(error) ? error.response?.status : undefined;
              if (status && status >= 400 && status < 500) return false;
              return failureCount < 3;
            },
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};
