import {
  Button,
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@autonoma/blacklight";
import { useRenameFolder } from "lib/query/folders.queries";
import { useRenameTest } from "lib/query/tests.queries";
import { useState } from "react";

interface RenameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "folder" | "test";
  id: string;
  currentName: string;
}

export function RenameDialog({ open, onOpenChange, type, id, currentName }: RenameDialogProps) {
  const [name, setName] = useState(currentName);
  const foldersRename = useRenameFolder(id);
  const testsRename = useRenameTest();

  const isPending = foldersRename.isPending || testsRename.isPending;
  const error = foldersRename.error ?? testsRename.error;

  function handleRename() {
    const trimmed = name.trim();
    if (trimmed.length === 0) return;
    if (type === "folder") {
      foldersRename.mutate({ folderId: id, name: trimmed }, { onSuccess: () => onOpenChange(false) });
    } else {
      testsRename.mutate({ testId: id, name: trimmed }, { onSuccess: () => onOpenChange(false) });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogBackdrop />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{type === "folder" ? "Rename folder" : "Rename test"}</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4 px-6 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleRename();
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rename-name">Name</Label>
            <Input
              id="rename-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              autoFocus
            />
          </div>
          {error != null && <p className="text-sm text-status-critical">{error.message}</p>}
        </form>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button onClick={handleRename} disabled={isPending || name.trim().length === 0}>
            {isPending ? "Renaming..." : "Rename"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
