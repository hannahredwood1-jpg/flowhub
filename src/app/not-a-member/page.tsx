import { Logo } from "@/components/AppShell";

const COPY: Record<string, { title: string; body: string }> = {
  guild: { title: "You're not in the server", body: "FLOWHUB is for members of the FLOWMTD Discord. Join the server with the invite link from your coach, then sign in again." },
  discord: { title: "Discord didn't answer", body: "We couldn't check your server membership just now. Wait a minute and sign in again." },
  default: { title: "Sign-in didn't finish", body: "Something went wrong during Discord sign-in. Try again from the home page." },
};

export default async function NotAMember({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  const c = COPY[reason ?? ""] ?? COPY.default;
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="hud w-full max-w-md p-8">
        <Logo />
        <h1 className="mt-8 font-display text-2xl font-bold ">{c.title}</h1>
        <p className="mt-3 text-ink-2">{c.body}</p>
        <a href="/" className="btn mt-6">Back to sign in</a>
      </div>
    </main>
  );
}
