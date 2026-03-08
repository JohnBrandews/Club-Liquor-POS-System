import { getSession } from "@/lib/auth/server";
import { ReportsAnalyticsClient } from "./ReportsAnalyticsClient";

export default async function ReportsPage() {
  const session = await getSession();

  return (
    <div className="px-6 py-6">
      <ReportsAnalyticsClient />
    </div>
  );
}


