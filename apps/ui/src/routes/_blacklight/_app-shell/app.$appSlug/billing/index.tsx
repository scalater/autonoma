import { createFileRoute } from "@tanstack/react-router";
import { BillingPanel } from "../settings/-components/billing-panel";
import { SettingsTabNav } from "../settings/-settings-tab-nav";

export const Route = createFileRoute("/_blacklight/_app-shell/app/$appSlug/billing/")({
  component: BillingPage,
});

function BillingPage() {
  const { appSlug } = Route.useParams();

  return (
    <div className="flex flex-col gap-6">
      <SettingsTabNav activeTab="billing" appSlug={appSlug} />
      <BillingPanel />
    </div>
  );
}
