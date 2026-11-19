import { redirect } from "next/navigation";

// The scorecards page is now called Performance; keep old bookmarks working.
const ScorecardsPage = () => redirect("/performance");

export default ScorecardsPage;
