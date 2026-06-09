import { getLive } from "@/lib/fifa-api";
import LiveView from "@/components/LiveView";

export const dynamic = "force-dynamic";

export default async function LivePage() {
  const { live, channels } = await getLive();
  return <LiveView initialLive={live} initialChannels={channels} />;
}
