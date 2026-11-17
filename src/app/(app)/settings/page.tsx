import { SettingsView } from "@/features/settings/_components/settings-view";

// Thin page; the API rejects non-Admins, the sidebar only shows the link to Admins.
const SettingsPage = () => <SettingsView />;

export default SettingsPage;
