import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  return (
    <AppShell role={session.user.role} name={session.user.name || ""}>
      {children}
    </AppShell>
  );
}
