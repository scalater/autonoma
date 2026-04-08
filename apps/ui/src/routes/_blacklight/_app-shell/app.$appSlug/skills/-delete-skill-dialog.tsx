import {
  Button,
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from "@autonoma/blacklight";
import { useDeleteSkill } from "lib/query/skills.queries";
import { type FormEvent, useState } from "react";
import { useCurrentApplication } from "../../-use-current-application";

interface DeleteSkillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skillSlug: string;
  skillName: string;
}

export function DeleteSkillDialog({ open, onOpenChange, skillSlug, skillName }: DeleteSkillDialogProps) {
  const app = useCurrentApplication();
  const deleteSkill = useDeleteSkill();
  const [confirmation, setConfirmation] = useState("");

  const canDelete = confirmation === skillName;

  function handleDelete(e: FormEvent) {
    e.preventDefault();
    if (!canDelete) return;
    deleteSkill.mutate(
      { applicationId: app.id, slug: skillSlug },
      {
        onSuccess: () => {
          onOpenChange(false);
          setConfirmation("");
        },
      },
    );
  }

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setConfirmation("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogBackdrop />
      <DialogContent>
        <form onSubmit={handleDelete}>
          <DialogHeader>
            <DialogTitle>Delete skill &quot;{skillName}&quot;?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Type{" "}
              <span className="font-mono font-medium text-text-primary">{skillName}</span> to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-4">
            <Input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={skillName}
              autoFocus
            />
          </div>
          {deleteSkill.error != null && (
            <p className="px-6 pb-4 text-sm text-status-critical">{deleteSkill.error.message}</p>
          )}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
            <Button type="submit" variant="destructive" disabled={!canDelete || deleteSkill.isPending}>
              {deleteSkill.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
