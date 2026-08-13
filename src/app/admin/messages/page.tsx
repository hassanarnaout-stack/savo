import { auth } from "@/lib/auth";
import { AdminMessagesClient } from "@/components/messaging/admin-messages-client";

export default async function AdminMessagesPage() {
  const session = await auth();
  return <AdminMessagesClient currentUserId={session!.user!.id!} />;
}
