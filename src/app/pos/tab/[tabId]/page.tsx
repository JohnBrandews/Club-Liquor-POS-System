import { TabScreen } from "./TabScreen";

export default function TabPage({ params }: { params: { tabId: string } }) {
  return <TabScreen tabId={params.tabId} />;
}

