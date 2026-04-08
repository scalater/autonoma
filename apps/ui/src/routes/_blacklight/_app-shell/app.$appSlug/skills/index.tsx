import { Button, Input, Panel, PanelBody, Skeleton } from "@autonoma/blacklight";
import { BookOpenIcon } from "@phosphor-icons/react/BookOpen";
import { EyeIcon } from "@phosphor-icons/react/Eye";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/MagnifyingGlass";
import { TrashIcon } from "@phosphor-icons/react/Trash";
import { UploadSimpleIcon } from "@phosphor-icons/react/UploadSimple";
import { createFileRoute } from "@tanstack/react-router";
import { ensureSkillsListData, useSkills } from "lib/query/skills.queries";
import { Suspense, useMemo, useState } from "react";
import { useCurrentApplication } from "../../-use-current-application";
import { SettingsTabNav } from "../settings/-settings-tab-nav";
import { DeleteSkillDialog } from "./-delete-skill-dialog";
import { UploadSkillsDialog } from "./-upload-skills-dialog";
import { ViewSkillDrawer } from "./-view-skill-drawer";

export const Route = createFileRoute("/_blacklight/_app-shell/app/$appSlug/skills/")({
  loader: ({ context, params: { appSlug } }) => {
    const app = context.applications.find((a) => a.slug === appSlug);
    if (app == null) return;
    return ensureSkillsListData(context.queryClient, app.id);
  },
  component: SkillsPage,
});

function SkillsList() {
  const app = useCurrentApplication();
  const { data: skills } = useSkills(app.id);
  const [skillToDelete, setSkillToDelete] = useState<{ slug: string; name: string } | undefined>();
  const [skillToView, setSkillToView] = useState<{ slug: string; name: string } | undefined>();
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);

  const filtered = useMemo(() => {
    if (search.trim() === "") return skills;
    const q = search.toLowerCase();
    return skills.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.slug.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q),
    );
  }, [skills, search]);

  if (skills.length === 0) {
    return (
      <Panel>
        <PanelBody className="flex flex-col items-center justify-center gap-3 py-16">
          <BookOpenIcon size={32} className="text-text-tertiary" />
          <p className="text-sm text-text-tertiary">No skills yet - upload your first one</p>
        </PanelBody>
      </Panel>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlassIcon size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-text-tertiary" />
          <Input
            placeholder="Search skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 font-mono text-xs"
          />
        </div>
        <Button variant="outline" className="ml-auto gap-2" onClick={() => setUploadOpen(true)}>
          <UploadSimpleIcon size={14} />
          Upload skills
        </Button>
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-tertiary">No skills matching "{search}"</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((skill) => (
            <Panel key={skill.id} className="group transition-colors hover:border-border-mid">
              <PanelBody className="flex h-full flex-col gap-3 p-4">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-sm font-medium text-text-primary">{skill.name}</span>
                  {skill.description != null && (
                    <span className="line-clamp-2 text-2xs text-text-secondary">{skill.description}</span>
                  )}
                  <span className="mt-auto pt-1 font-mono text-2xs text-text-tertiary">{skill.slug}</span>
                </div>
                <div className="flex items-center justify-end gap-1 border-t border-border-dim pt-2">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setSkillToView({ slug: skill.slug, name: skill.name })}
                  >
                    <EyeIcon size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setSkillToDelete({ slug: skill.slug, name: skill.name })}
                  >
                    <TrashIcon size={14} />
                  </Button>
                </div>
              </PanelBody>
            </Panel>
          ))}
        </div>
      )}

      <DeleteSkillDialog
        open={skillToDelete != null}
        onOpenChange={(open) => {
          if (!open) setSkillToDelete(undefined);
        }}
        skillSlug={skillToDelete?.slug ?? ""}
        skillName={skillToDelete?.name ?? ""}
      />
      <ViewSkillDrawer
        open={skillToView != null}
        onOpenChange={(open) => {
          if (!open) setSkillToView(undefined);
        }}
        skillSlug={skillToView?.slug ?? ""}
        skillName={skillToView?.name ?? ""}
      />
      <UploadSkillsDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  );
}

function SkillsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {["sk-1", "sk-2", "sk-3", "sk-4", "sk-5", "sk-6"].map((id) => (
        <Panel key={id}>
          <PanelBody className="p-4">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-32" />
            </div>
          </PanelBody>
        </Panel>
      ))}
    </div>
  );
}

function SkillsPage() {
  const { appSlug } = Route.useParams();

  return (
    <div className="flex flex-col gap-6">
      <SettingsTabNav activeTab="skills" appSlug={appSlug} />

      <Suspense fallback={<SkillsSkeleton />}>
        <SkillsList />
      </Suspense>
    </div>
  );
}
