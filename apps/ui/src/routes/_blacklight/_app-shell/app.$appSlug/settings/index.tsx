import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Label,
  Panel,
  PanelBody,
  PanelHeader,
  PanelTitle,
  Separator,
  Textarea,
  useTheme,
} from "@autonoma/blacklight";
import { MoonIcon } from "@phosphor-icons/react/Moon";
import { SunIcon } from "@phosphor-icons/react/Sun";
import { createFileRoute } from "@tanstack/react-router";
import { useUpdateApplicationSettings } from "lib/query/applications.queries";
import { useEffect, useState } from "react";
import { useCurrentApplication } from "../../-use-current-application";
import { DeleteApplicationDialog } from "./-delete-application-dialog";
import { SettingsTabNav } from "./-settings-tab-nav";

export const Route = createFileRoute("/_blacklight/_app-shell/app/$appSlug/settings/")({
  component: SettingsPage,
});

const MAX_INSTRUCTIONS_LENGTH = 2000;

const EXAMPLE_INSTRUCTIONS = [
  "Always use the email test-user@example.com when logging in.",
  "Dismiss cookie banners before interacting with the page.",
  "Wait for the loading spinner to disappear before asserting content.",
  "The app uses dark mode by default - do not toggle theme settings.",
];

function ThemePanel() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "blacklight-dark";

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Appearance</PanelTitle>
      </PanelHeader>
      <PanelBody className="space-y-4">
        <p className="text-xs text-text-secondary">Choose between light and dark mode for the interface.</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setTheme("blacklight")}
            className={`flex flex-1 items-center gap-3 rounded-md border px-4 py-3 text-xs font-medium transition-colors ${
              !isDark
                ? "border-primary-ink bg-primary-ink/10 text-text-primary"
                : "border-border-dim text-text-secondary hover:border-border-mid hover:text-text-primary"
            }`}
          >
            <SunIcon size={18} weight={!isDark ? "fill" : "regular"} />
            Light
          </button>
          <button
            type="button"
            onClick={() => setTheme("blacklight-dark")}
            className={`flex flex-1 items-center gap-3 rounded-md border px-4 py-3 text-xs font-medium transition-colors ${
              isDark
                ? "border-primary-ink bg-primary-ink/10 text-text-primary"
                : "border-border-dim text-text-secondary hover:border-border-mid hover:text-text-primary"
            }`}
          >
            <MoonIcon size={18} weight={isDark ? "fill" : "regular"} />
            Dark
          </button>
        </div>
        <p className="font-mono text-3xs text-text-tertiary">You can also press D to toggle the theme.</p>
      </PanelBody>
    </Panel>
  );
}

function SettingsPage() {
  const { appSlug } = Route.useParams();
  const currentApp = useCurrentApplication();
  const [savedInstructions, setSavedInstructions] = useState(currentApp.customInstructions ?? "");
  const [customInstructions, setCustomInstructions] = useState(currentApp.customInstructions ?? "");
  const updateSettings = useUpdateApplicationSettings();

  useEffect(() => {
    const instructions = currentApp.customInstructions ?? "";
    setSavedInstructions(instructions);
    setCustomInstructions(instructions);
  }, [currentApp.customInstructions]);

  const hasChanges = customInstructions !== savedInstructions;

  function handleSave() {
    const normalizedInstructions = customInstructions.trim();
    updateSettings.mutate(
      {
        id: currentApp.id,
        customInstructions: normalizedInstructions === "" ? null : normalizedInstructions,
      },
      {
        onSuccess: () => {
          setSavedInstructions(normalizedInstructions);
          setCustomInstructions(normalizedInstructions);
        },
      },
    );
  }

  function handleReset() {
    setCustomInstructions(savedInstructions);
  }

  return (
    <div className="flex flex-col gap-6">
      <SettingsTabNav activeTab="general" appSlug={appSlug} />
      <div className="max-w-3xl space-y-4">
        <Panel>
          <PanelHeader>
            <PanelTitle>Custom agent instructions</PanelTitle>
          </PanelHeader>
          <PanelBody className="space-y-4">
            <p className="text-xs text-text-secondary">
              These instructions are included with every test run for this application. Use them to provide context
              about your app, set default behaviors, or specify login credentials.
            </p>

            <div className="space-y-2">
              <Label
                htmlFor="custom-instructions"
                className="font-mono text-2xs uppercase tracking-widest text-text-tertiary"
              >
                Instructions
              </Label>
              <Textarea
                id="custom-instructions"
                placeholder="Enter custom instructions for the test agent..."
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                maxLength={MAX_INSTRUCTIONS_LENGTH}
                rows={8}
                className="resize-y font-mono text-xs"
              />
              <p className="text-right font-mono text-3xs text-text-tertiary">
                {customInstructions.length} / {MAX_INSTRUCTIONS_LENGTH}
              </p>
            </div>

            <div className="rounded-md border border-border-dim bg-surface-base p-4">
              <p className="mb-3 font-mono text-2xs uppercase tracking-widest text-text-tertiary">Examples</p>
              <ul className="space-y-2">
                {EXAMPLE_INSTRUCTIONS.map((example) => (
                  <li key={example} className="flex items-start gap-2 text-xs text-text-secondary">
                    <span className="mt-1.5 block size-1 shrink-0 rounded-full bg-text-tertiary" />
                    <span>{example}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Separator />

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={handleReset} disabled={!hasChanges} aria-label="app-settings-reset">
                Reset
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || updateSettings.isPending}
                aria-label="app-settings-save"
              >
                {updateSettings.isPending ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </PanelBody>
        </Panel>

        <Alert>
          <AlertTitle>How this is applied</AlertTitle>
          <AlertDescription>
            The saved instructions are appended to the end of each run prompt. They apply to all test runs within this
            application, including generated and manually created tests.
          </AlertDescription>
        </Alert>

        <ThemePanel />

        <DangerZonePanel />
      </div>
    </div>
  );
}

function DangerZonePanel() {
  const currentApp = useCurrentApplication();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  return (
    <>
      <Panel>
        <PanelHeader>
          <PanelTitle>Danger zone</PanelTitle>
        </PanelHeader>
        <PanelBody>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-text-primary">Delete application</p>
              <p className="text-xs text-text-secondary">
                Permanently remove this application and all its data. This action cannot be undone.
              </p>
            </div>
            <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
              Delete
            </Button>
          </div>
        </PanelBody>
      </Panel>
      <DeleteApplicationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        applicationId={currentApp.id}
        applicationName={currentApp.name}
      />
    </>
  );
}
