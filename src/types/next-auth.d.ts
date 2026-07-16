import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      workspaceId?: string;
      workspaceRole?: string;
    } & DefaultSession["user"];
  }

  interface User {
    workspaceId?: string;
    workspaceRole?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    workspaceId?: string;
    workspaceRole?: string;
  }
}
