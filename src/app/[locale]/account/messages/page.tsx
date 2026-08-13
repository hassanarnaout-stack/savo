import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AccountMessagesClient } from "@/components/messaging/account-messages-client";

export default async function AccountMessagesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/account/messages");

  return <AccountMessagesClient currentUserId={session.user.id} />;
}
