import "server-only";
import { z } from "zod";

const ids = z
  .string()
  .default("")
  .transform((s) => s.split(",").map((x) => x.trim()).filter(Boolean));

const schema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  AUTH_DISCORD_ID: z.string().min(1),
  AUTH_DISCORD_SECRET: z.string().min(1),
  DISCORD_GUILD_ID: z.string().regex(/^\d{17,20}$/, "Discord guild ID must be a snowflake"),
  DISCORD_ADMIN_ROLE_IDS: ids,
  DISCORD_COACH_ROLE_IDS: ids,
  DISCORD_BOT_TOKEN: z.string().optional(),
  TOKEN_ENCRYPTION_KEY: z
    .string()
    .refine((k) => Buffer.from(k, "base64").length === 32, "TOKEN_ENCRYPTION_KEY must be 32 bytes, base64-encoded"),
});

export const env = schema.parse(process.env);
