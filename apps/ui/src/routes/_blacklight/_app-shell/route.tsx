import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { ensureOrgStatusData, ensureOrganizationsData, ensureSessionData } from "lib/query/auth.queries";
import type { RouteContext } from "../../__root";
import { AppShellLayout } from "./-layout/app-shell-layout";

export const Route = createFileRoute("/_blacklight/_app-shell")({
  component: AppShell,
  beforeLoad: async (opts) => {
    return getAppShellContext(opts.context);
  },
});

async function getAppShellContext({ queryClient, trpc }: RouteContext) {
  const session = await ensureSessionData(queryClient);
  if (session == null) throw redirect({ to: "/login", search: { error: undefined } });

  const user = session.user;
  const isAdmin = user.role === "admin";

  const activeOrganizationId = session.session.activeOrganizationId;
  if (activeOrganizationId == null) throw redirect({ to: "/pending" });

  const organizations = await ensureOrganizationsData(queryClient);

  const activeOrganization =
    organizations.find((org) => org.id === activeOrganizationId) ??
    (await queryClient.fetchQuery({ ...trpc.auth.activeOrg.queryOptions(), staleTime: 0 }));
  if (activeOrganization == null) throw new Error("No active organization found");

  const orgStatus = await ensureOrgStatusData(queryClient);
  if (orgStatus === "pending" && !isAdmin) throw redirect({ to: "/pending" });
  if (orgStatus === "rejected" && !isAdmin) throw redirect({ to: "/rejected" });

  const applications = await queryClient.fetchQuery(trpc.applications.list.queryOptions());

  if (applications.length === 0) {
    throw redirect({ to: "/onboarding/install" });
  }

  return { user, organizations, activeOrganization, applications };
}

function AppShell() {
  return (
    <AppShellLayout>
      <Outlet />
    </AppShellLayout>
  );
}
