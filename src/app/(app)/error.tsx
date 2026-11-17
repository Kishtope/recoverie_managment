"use client";

import { ErrorView } from "@/components/entity-components/error-view";

// Error boundary for every signed-in page: shows the shared ErrorView with a retry instead of a blank screen.
const AppError = ({ retry }: { error: unknown; retry: () => void }) => (
  <ErrorView message="Something went wrong loading this page." onRetry={retry} />
);

export default AppError;
