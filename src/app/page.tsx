import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { LoginScreen } from "@/components/LoginScreen";

export default async function Landing() {
  const session = await auth();
  if (session?.user?.id) redirect("/dashboard");

  async function connect() {
    "use server";
    await signIn("discord", { redirectTo: "/dashboard" });
  }
  return <LoginScreen action={connect} />;
}
