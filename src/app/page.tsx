import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/server";

export default async function Home() {
  const session = await getSession();
  redirect(session ? "/pos" : "/login");
}
