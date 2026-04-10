import { Navigate, createFileRoute } from "@tanstack/react-router";
import { IntroNavButtons } from "./-components/intro-nav-buttons";
import { MockDashboard } from "./-components/mock-dashboard";
import { OnboardingPageHeader } from "./-components/onboarding-page-header";

export const Route = createFileRoute("/_blacklight/onboarding/intro-platform-tour")({
  component: () => <Navigate to="/onboarding" search={{ step: "intro-platform-tour" }} />,
});

export function IntroPlatformTourPage() {
  return (
    <>
      <OnboardingPageHeader
        title="Your Dashboard"
        description={
          <p>
            Here&apos;s what you&apos;ll see after setup is complete. The dashboard gives you a full view of your test
            suite, execution results, and any bugs the agent discovers.
          </p>
        }
      />

      <MockDashboard />

      <IntroNavButtons
        backTo="/onboarding"
        backSearch={{ step: "intro-key-concepts" }}
        nextTo="/onboarding"
        nextSearch={{ step: "install" }}
        nextLabel="Start Installation"
      />
    </>
  );
}
