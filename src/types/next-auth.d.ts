import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role?: "MEMBER" | "COACH" | "ADMIN";
  }
  interface Session {
    user: { id: string; role: "MEMBER" | "COACH" | "ADMIN"; discordId: string } & DefaultSession["user"];
  }
}
