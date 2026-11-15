import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/app/WorkspacePages";
export const Route = createFileRoute("/insurance")({
  head: () => ({ meta: [
    { title: "My Insurance — FIRSTLOOK" },
    { name: "description", content: "Save private insurance notes and verify coverage with your insurer." },
    { property: "og:title", content: "My Insurance — FIRSTLOOK" },
    { property: "og:description", content: "Save private insurance notes and verify coverage with your insurer." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <WorkspacePage page="insurance" />,
});
