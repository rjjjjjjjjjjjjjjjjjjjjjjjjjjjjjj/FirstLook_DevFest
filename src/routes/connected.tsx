import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/app/WorkspacePages";
export const Route = createFileRoute("/connected")({
  head: () => ({ meta: [
    { title: "Connected Health — FIRSTLOOK" },
    { name: "description", content: "Review your private health profile and device connection availability." },
    { property: "og:title", content: "Connected Health — FIRSTLOOK" },
    { property: "og:description", content: "Review your private health profile and device connection availability." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <WorkspacePage page="connected" />,
});
