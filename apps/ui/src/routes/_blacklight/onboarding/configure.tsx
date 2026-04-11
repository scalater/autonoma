import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_blacklight/onboarding/configure")({
  component: () => <Navigate to="/onboarding" search={{ step: "install", appId: undefined }} />,
});
