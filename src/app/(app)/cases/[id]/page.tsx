import { CaseDetailView } from "@/features/cases/_components/case-detail-view";

// Thin page: reads the loan id from the route (params is a Promise in Next 16) and renders the detail view.
const CaseDetailPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  return <CaseDetailView id={id} />;
};

export default CaseDetailPage;
