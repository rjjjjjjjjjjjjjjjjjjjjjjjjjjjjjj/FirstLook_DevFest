import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/app/WorkspacePages";
export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [
    { title: "Settings — FIRSTLOOK" },
    { name: "description", content: "Manage FirstLook language, account and privacy preferences." },
    { property: "og:title", content: "Settings — FIRSTLOOK" },
    { property: "og:description", content: "Manage FirstLook language, account and privacy preferences." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <WorkspacePage page="settings" />,
});
