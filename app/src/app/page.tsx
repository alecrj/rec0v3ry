import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { userId } = await auth();

  if (userId) {
    // User is signed in - send to setup (which redirects to dashboard if already set up)
    redirect("/setup");
  } else {
    // User is not signed in - send to login
    redirect("/login");
  }
}
