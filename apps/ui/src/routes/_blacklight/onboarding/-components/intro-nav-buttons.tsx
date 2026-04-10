import { Button } from "@autonoma/blacklight";
import { ArrowLeftIcon } from "@phosphor-icons/react/ArrowLeft";
import { ArrowRightIcon } from "@phosphor-icons/react/ArrowRight";
import { useNavigate } from "@tanstack/react-router";
import type { OnboardingStep } from "lib/onboarding/onboarding-steps";

interface IntroNavButtonsProps {
  backTo?: string;
  backSearch?: { step?: OnboardingStep };
  nextTo: string;
  nextSearch?: { step?: OnboardingStep };
  nextLabel?: string;
  onBackClick?: () => void;
  onNextClick?: () => void;
  onBeforeNext?: () => void;
}

export function IntroNavButtons({
  backTo,
  backSearch,
  nextTo,
  nextSearch,
  nextLabel,
  onBackClick,
  onNextClick,
  onBeforeNext,
}: IntroNavButtonsProps) {
  const navigate = useNavigate();

  function handleNext() {
    if (onNextClick != null) {
      onNextClick();
      return;
    }
    onBeforeNext?.();
    void navigate({ to: nextTo, search: nextSearch });
  }

  function handleBack() {
    if (onBackClick != null) {
      onBackClick();
      return;
    }
    if (backTo != null) {
      void navigate({ to: backTo, search: backSearch });
    }
  }

  return (
    <div className="mt-12 flex items-center gap-4">
      {backTo != null && (
        <Button variant="ghost" className="gap-2 font-mono text-sm" onClick={handleBack}>
          <ArrowLeftIcon size={16} weight="bold" />
          Back
        </Button>
      )}
      <Button variant="accent" className="flex-1 gap-2 font-mono text-sm font-bold uppercase" onClick={handleNext}>
        {nextLabel ?? "Continue"}
        <ArrowRightIcon size={16} weight="bold" />
      </Button>
    </div>
  );
}
