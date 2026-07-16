import { redirect } from "next/navigation";
import { AuthError, getSessionContext, isClientRole } from "@/lib/rbac";

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  try {
    const ctx = await getSessionContext();
    if (isClientRole(ctx.workspaceRole)) {
      redirect("/portal");
    }
  } catch (e) {
    if (e instanceof AuthError) {
      redirect("/login?error=NoWorkspaceAccess");
    }
    throw e;
  }

  return children;
}
