import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/app/WorkspacePages";
export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [
    { title: "Reports — FIRSTLOOK" },
    { name: "description", content: "Review and download your private screening summaries." },
    { property: "og:title", content: "Reports — FIRSTLOOK" },
    { property: "og:description", content: "Review and download your private screening summaries." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <WorkspacePage page="reports" />,
});
