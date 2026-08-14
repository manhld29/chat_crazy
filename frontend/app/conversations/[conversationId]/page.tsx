import { AppShell } from "@/components/app-shell";

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  return <AppShell initialConversationId={conversationId} initialView="chat" />;
}
