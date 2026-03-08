import { getSession } from "@/lib/auth/server";
import { PosHomeClient } from "./PosHomeClient";

export default async function PosHome() {
  const session = await getSession();

  return (
    <div className="min-h-dvh">
      <PosHomeClient role={session?.role ?? "BARTENDER"} />
    </div>
  );
}

