import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";
import { prisma } from "@/lib/prisma";
import {
  ensureGoogleWorkspaceMembership,
  loadWorkspaceForUser,
} from "@/lib/auth/workspace-provision";
const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.id || !user.email) return false;
        const allowed = await ensureGoogleWorkspaceMembership(user.id, user.email);
        if (!allowed) return "/login?error=NoWorkspaceAccess";
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        const member = await loadWorkspaceForUser(user.id);
        token.workspaceId = member?.workspaceId;
        token.workspaceRole = member?.role;
      } else if (token.id) {
        const member = await loadWorkspaceForUser(token.id as string);
        token.workspaceId = member?.workspaceId;
        token.workspaceRole = member?.role;
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
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: false,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            workspaceMembers: { take: 1, orderBy: { createdAt: "asc" } },
          },
        });

        if (!user?.hashedPassword) return null;
        const valid = await bcrypt.compare(password, user.hashedPassword);
        if (!valid) return null;

        const member = user.workspaceMembers[0];
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          workspaceId: member?.workspaceId,
          workspaceRole: member?.role,
        };
      },
    }),
  ],
});
