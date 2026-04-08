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
  ScrollArea,
} from "@autonoma/blacklight";
import { FolderIcon } from "@phosphor-icons/react/Folder";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMoveFolder } from "lib/query/folders.queries";
import { trpc } from "lib/trpc";
import { useState } from "react";
import { useCurrentApplication } from "../../../../-use-current-application";
import { collectFolderOptions } from "../collect-folder-options";
import type { FolderRecord } from "../tree-types";

function collectDescendantFolderIds(folderId: string, folders: FolderRecord[]): Set<string> {
  const ids = new Set<string>();
  const walk = (id: string) => {
    ids.add(id);
    for (const f of folders) {
      if (f.parentId === id) walk(f.id);
    }
  };
  walk(folderId);
  return ids;
}

interface MoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string;
  name: string;
}

export function MoveDialog({ open, onOpenChange, folderId }: MoveDialogProps) {
  const [selectedId, setSelectedId] = useState<string>("__root__");
  const currentApp = useCurrentApplication();

  const { data: folders } = useSuspenseQuery(trpc.folders.list.queryOptions({ applicationId: currentApp.id }));
  const excludeIds = collectDescendantFolderIds(folderId, folders);
  const folderOptions = collectFolderOptions(folders, excludeIds);

  const moveFolder = useMoveFolder(folderId);

  function handleMove() {
    const newParentId = selectedId === "__root__" ? null : selectedId;
    moveFolder.mutate({ folderId, newParentId }, { onSuccess: () => onOpenChange(false) });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogBackdrop />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move folder</DialogTitle>
          <DialogDescription>Select a destination folder.</DialogDescription>
        </DialogHeader>
        <div className="px-6 py-2">
          <ScrollArea className="max-h-48">
            <div className="divide-y divide-border-dim rounded-md border border-border-dim">
              {folderOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedId(opt.id)}
                  className={`w-full flex items-center gap-2 py-2 pr-3 text-left text-sm transition-colors hover:bg-surface-raised ${selectedId === opt.id ? "bg-surface-raised font-medium text-text-primary" : "text-text-secondary"}`}
                  style={{ paddingLeft: `${12 + opt.depth * 16}px` }}
                >
                  <FolderIcon size={16} className="shrink-0 text-text-tertiary" />
                  {opt.name}
                </button>
              ))}
            </div>
          </ScrollArea>
          {moveFolder.error != null && <p className="mt-2 text-sm text-status-critical">{moveFolder.error.message}</p>}
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button onClick={handleMove} disabled={moveFolder.isPending}>
            {moveFolder.isPending ? "Moving..." : "Move"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
