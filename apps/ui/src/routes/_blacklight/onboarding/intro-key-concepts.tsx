import { DatabaseIcon } from "@phosphor-icons/react/Database";
import { ListChecksIcon } from "@phosphor-icons/react/ListChecks";
import { Navigate, createFileRoute } from "@tanstack/react-router";
import { IntroNavButtons } from "./-components/intro-nav-buttons";
import { EnvironmentFactoryConceptVisual, ScenarioConceptVisual } from "./-components/key-concepts-visuals";
import { OnboardingPageHeader } from "./-components/onboarding-page-header";
import { StageCard } from "./-components/stage-card";

export const Route = createFileRoute("/_blacklight/onboarding/intro-key-concepts")({
  component: () => <Navigate to="/onboarding" search={{ step: "intro-key-concepts", appId: undefined }} />,
});

export function IntroKeyConceptsPage() {
  return (
    <>
      <OnboardingPageHeader
        title="Key Concepts"
        description={
          <p>Two ideas that show up everywhere in setup. The motion in each card is specific to what the term means.</p>
        }
      />

      <section className="space-y-4">
        <h2 className="font-mono text-2xs uppercase tracking-widest text-text-tertiary">Core terms</h2>

        <div className="relative grid gap-4 lg:grid-cols-2">
          <StageCard
            className="onboarding-stage-card-enter"
            number={1}
            icon={<ListChecksIcon size={16} weight="duotone" className="text-primary" />}
            title="Scenario"
            description="A fixed starting state for your app before a test - carts, users, flags - so every run is repeatable."
            visual={<ScenarioConceptVisual />}
          />

          <StageCard
            className="onboarding-stage-card-enter onboarding-stage-card-enter-delayed"
            number={2}
            icon={<DatabaseIcon size={16} weight="duotone" className="text-primary" />}
            title="Environment Factory"
            description="An endpoint Autonoma calls to spin up that scenario - DB, users, and app state, fresh each time."
            visual={<EnvironmentFactoryConceptVisual />}
          />
        </div>
      </section>

      <div className="mt-10 border border-primary-ink/20 bg-primary-ink/5 p-5">
        <p className="text-sm leading-relaxed text-text-secondary">
          <span className="font-medium text-text-primary">You won&apos;t build these by hand in onboarding.</span> The
          agent drafts the factory; you review and wire it in when prompted.
        </p>
      </div>

      <IntroNavButtons
        backTo="/onboarding"
        backSearch={{ step: "intro-welcome" }}
        nextTo="/onboarding"
        nextSearch={{ step: "intro-platform-tour" }}
      />
    </>
  );
}
