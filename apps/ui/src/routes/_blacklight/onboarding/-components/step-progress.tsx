import { cn } from "@autonoma/blacklight";
import { Link } from "@tanstack/react-router";
import type { OnboardingStep } from "lib/onboarding/onboarding-steps";

interface StepDef {
  id: OnboardingStep;
  label: string;
}

interface Section {
  title: string;
  steps: StepDef[];
}

export const SECTIONS: Section[] = [
  {
    title: "Introduction",
    steps: [
      { id: "intro-welcome", label: "Welcome" },
      { id: "intro-key-concepts", label: "Key Concepts" },
      { id: "intro-platform-tour", label: "Platform Tour" },
    ],
  },
  {
    title: "Installation",
    steps: [
      { id: "install", label: "Install" },
      { id: "working", label: "Generate Tests" },
      { id: "scenario-dry-run", label: "Deploy Autonoma SDK" },
      { id: "github", label: "Connect GitHub" },
    ],
  },
];

const ALL_STEP_IDS = SECTIONS.flatMap((s) => s.steps.map((step) => step.id));

interface StepProgressProps {
  currentStepId: string;
}

export function StepProgress({ currentStepId }: StepProgressProps) {
  const resolvedCurrentStep = ALL_STEP_IDS.includes(currentStepId as OnboardingStep)
    ? (currentStepId as OnboardingStep)
    : "intro-welcome";
  const currentIndex = ALL_STEP_IDS.indexOf(resolvedCurrentStep);

  return (
    <div className="flex flex-col">
      {SECTIONS.map((section, sectionIndex) => (
        <div key={section.title} className={cn(sectionIndex > 0 && "mt-8")}>
          <h4 className="mb-5 font-mono text-3xs uppercase tracking-widest text-text-tertiary">{section.title}</h4>

          {section.steps.map((step, stepIndex) => {
            const globalIndex = ALL_STEP_IDS.indexOf(step.id);
            const isActive = step.id === currentStepId;
            const isCompleted = globalIndex < currentIndex;
            const isLastInSection = stepIndex === section.steps.length - 1;

            const content = (
              <>
                {/* Timeline column */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "mt-1.5 size-2 shrink-0 rounded-full transition-colors",
                      isActive && "bg-primary-ink shadow-[0_0_8px_var(--accent-glow)]",
                      isCompleted && "bg-primary-ink",
                      !isActive && !isCompleted && "border border-border-dim bg-surface-void",
                    )}
                  />
                  {!isLastInSection && (
                    <div
                      className={cn(
                        "my-1 w-px flex-1 transition-colors",
                        isActive && "bg-primary-ink shadow-[0_0_10px_var(--accent-glow)]",
                        isCompleted && "bg-primary-ink/40",
                        !isActive && !isCompleted && "bg-border-dim",
                      )}
                    />
                  )}
                </div>

                {/* Content */}
                <div className={cn("flex flex-col gap-1 pb-8", isLastInSection && "pb-0")}>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-sm font-medium tracking-wide transition-colors",
                        isActive
                          ? "text-text-primary"
                          : isCompleted
                            ? "text-text-secondary group-hover:text-text-primary"
                            : "text-text-secondary",
                      )}
                    >
                      {step.label}
                    </span>
                    {isActive && (
                      <span className="border border-primary-ink/30 bg-primary-ink/10 px-1.5 py-0.5 font-mono text-4xs uppercase tracking-widest text-primary-ink">
                        Current
                      </span>
                    )}
                  </div>
                </div>
              </>
            );

            if (isCompleted) {
              return (
                <Link
                  key={step.id}
                  to="/onboarding"
                  search={{ step: step.id }}
                  className="group flex cursor-pointer gap-5"
                >
                  {content}
                </Link>
              );
            }

            return (
              <div key={step.id} className="flex gap-5">
                {content}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
