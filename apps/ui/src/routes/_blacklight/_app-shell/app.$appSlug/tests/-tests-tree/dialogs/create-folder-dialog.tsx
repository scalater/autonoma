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
import { useCreateFolder } from "lib/query/folders.queries";
import { useState } from "react";

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string;
  parentId?: string;
}

export function CreateFolderDialog({ open, onOpenChange, applicationId, parentId }: CreateFolderDialogProps) {
  const [name, setName] = useState("");
  const createFolder = useCreateFolder();

  function handleCreate() {
    const trimmed = name.trim();
    if (trimmed.length === 0) return;
    createFolder.mutate(
      { name: trimmed, applicationId, parentId },
      {
        onSuccess: () => {
          onOpenChange(false);
          setName("");
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogBackdrop />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New folder</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4 px-6 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleCreate();
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-folder-name">Name</Label>
            <Input
              id="create-folder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Folder name"
              autoFocus
            />
          </div>
          {createFolder.error != null && <p className="text-sm text-status-critical">{createFolder.error.message}</p>}
        </form>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button onClick={handleCreate} disabled={createFolder.isPending || name.trim().length === 0}>
            {createFolder.isPending ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
