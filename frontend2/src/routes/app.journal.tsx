import { createFileRoute } from "@tanstack/react-router";
import { JournalComposer } from "@/components/JournalComposer";

export const Route = createFileRoute("/app/journal")({
  head: () => ({
    meta: [
      { title: "New Entry — MindVault" },
      {
        name: "description",
        content: "Write a journal entry, tag your mood, and ask your local AI companion for a reflection.",
      },
      { property: "og:title", content: "New Entry — MindVault" },
      { property: "og:description", content: "Write privately and reflect with your local AI companion." },
    ],
  }),
  component: JournalPage,
});

function JournalPage() {
  return <JournalComposer heading="New entry" />;
}
