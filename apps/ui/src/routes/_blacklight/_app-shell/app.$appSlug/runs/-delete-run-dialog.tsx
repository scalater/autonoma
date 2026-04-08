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
} from "@autonoma/blacklight";
import { useDeleteRun } from "lib/query/runs.queries";

interface DeleteRunDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  runId: string;
  runName: string;
  onSuccess: () => void;
}

export function DeleteRunDialog({ open, onOpenChange, runId, runName, onSuccess }: DeleteRunDialogProps) {
  const deleteRun = useDeleteRun(runId);

  function handleDelete() {
    deleteRun.mutate(
      { runId },
      {
        onSuccess: () => {
          onOpenChange(false);
          onSuccess();
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogBackdrop />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete &quot;{runName}&quot;?</DialogTitle>
          <DialogDescription>This action cannot be undone.</DialogDescription>
        </DialogHeader>
        {deleteRun.error != null && <p className="px-6 pb-4 text-sm text-status-critical">{deleteRun.error.message}</p>}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteRun.isPending}>
            {deleteRun.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
