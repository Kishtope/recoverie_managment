import { redirect } from "next/navigation";

// Team performance now lives on the Scorecards page; keep old bookmarks working.
const PerformancePage = () => redirect("/scorecards");

export default PerformancePage;
