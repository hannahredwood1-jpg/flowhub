// Edge-safe Auth.js config (no Prisma, no Node crypto) — imported by middleware.
import type { NextAuthConfig } from "next-auth";
import Discord from "next-auth/providers/discord";

export default {
  providers: [
    Discord({
      // identify → id, username, avatar. guilds.members.read → this user's roles in OUR guild only.
      // No email scope: we don't need it.
      authorization: "https://discord.com/api/oauth2/authorize?scope=identify+guilds.members.read",
    }),
  ],
  pages: { signIn: "/", error: "/not-a-member" },
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  callbacks: {
    // Coarse route gating in middleware (UX only). Real enforcement happens server-side in src/lib/rbac.ts.
    authorized({ auth, request }) {
      const path = request.nextUrl.pathname;
      const user = auth?.user;
      if (path.startsWith("/coach")) {
        if (!user) return false;
        if (user.role !== "COACH" && user.role !== "ADMIN") return Response.redirect(new URL("/dashboard", request.nextUrl));
      }
      if (path.startsWith("/dashboard")) return !!user;
      return true;
    },
    session({ session, token }) {
      session.user.id = token.uid as string;
      session.user.role = token.role as "MEMBER" | "COACH" | "ADMIN";
      session.user.discordId = token.discordId as string;
      return session;
    },
  },
} satisfies NextAuthConfig;
