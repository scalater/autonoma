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
import { useDeleteGeneration } from "lib/query/generations.queries";
import { type FormEvent, useState } from "react";

interface DeleteGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  generationId: string;
  generationName: string;
}

export function DeleteGenerationDialog({
  open,
  onOpenChange,
  generationId,
  generationName,
}: DeleteGenerationDialogProps) {
  const deleteGeneration = useDeleteGeneration();
  const [confirmation, setConfirmation] = useState("");

  const canDelete = confirmation === generationName;

  function handleDelete(e: FormEvent) {
    e.preventDefault();
    if (!canDelete) return;
    deleteGeneration.mutate(
      { generationId },
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
            <DialogTitle>Delete &quot;{generationName}&quot;?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Type{" "}
              <span className="font-mono font-medium text-text-primary">{generationName}</span> to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-4">
            <Input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={generationName}
              autoFocus
            />
          </div>
          {deleteGeneration.error != null && (
            <p className="px-6 pb-4 text-sm text-status-critical">{deleteGeneration.error.message}</p>
          )}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
            <Button type="submit" variant="destructive" disabled={!canDelete || deleteGeneration.isPending}>
              {deleteGeneration.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
