import { FlaskIcon } from "@phosphor-icons/react/Flask";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_blacklight/_app-shell/app/$appSlug/tests/")({
  component: TestsIndexPage,
});

function TestsIndexPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-text-tertiary">
      <FlaskIcon size={32} />
      <p className="text-sm">Select a test from the sidebar</p>
    </div>
  );
}
