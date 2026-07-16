import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isLoginPage = nextUrl.pathname === "/login";
      const isInvitePage = nextUrl.pathname.startsWith("/invite");
      const isApiAuth = nextUrl.pathname.startsWith("/api/auth");
      const isIntakeApi = nextUrl.pathname.startsWith("/api/leads/");

      if (isApiAuth || isIntakeApi) return true;
      if (isInvitePage) return true;
      if (isLoginPage) {
        if (isLoggedIn) {
          const u = auth.user as { workspaceId?: string; workspaceRole?: string };
          if (u.workspaceId) {
            if (u.workspaceRole === "client") {
              return Response.redirect(new URL("/portal", nextUrl));
            }
            return Response.redirect(new URL("/dashboard", nextUrl));
          }
          return true;
        }
        return true;
      }
      if (!isLoggedIn) return false;
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.workspaceId = (user as { workspaceId?: string }).workspaceId;
        token.workspaceRole = (user as { workspaceRole?: string }).workspaceRole;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.workspaceId = token.workspaceId as string | undefined;
        session.user.workspaceRole = token.workspaceRole as string | undefined;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
