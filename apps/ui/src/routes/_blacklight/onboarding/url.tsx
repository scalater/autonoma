import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_blacklight/onboarding/url")({
  component: () => <Navigate to="/onboarding" search={{ step: "scenario-dry-run" }} />,
});
