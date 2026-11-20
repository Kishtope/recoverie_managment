import { Suspense } from "react";
import { LoadingView } from "@/components/entity-components/loading-view";
import { RetailerDetailView } from "@/features/retailers/_components/retailer-detail-view";

// Thin page: reads the retailer id from the route (params is a Promise in Next 16); Suspense is required because the view reads the URL's search params.
const RetailerDetailPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  return (
    <Suspense fallback={<LoadingView message="Loading retailer…" />}>
      <RetailerDetailView id={id} />
    </Suspense>
  );
};

export default RetailerDetailPage;
