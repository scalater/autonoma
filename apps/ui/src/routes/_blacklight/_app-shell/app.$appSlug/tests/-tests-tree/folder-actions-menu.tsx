import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@autonoma/blacklight";
import { DotsThreeIcon } from "@phosphor-icons/react/DotsThree";
import { FolderPlusIcon } from "@phosphor-icons/react/FolderPlus";
import { FolderSimpleIcon } from "@phosphor-icons/react/FolderSimple";
import { PencilSimpleIcon } from "@phosphor-icons/react/PencilSimple";
import { TrashIcon } from "@phosphor-icons/react/Trash";
import { useAuth } from "lib/auth";

interface FolderActionsMenuProps {
  onNewSubfolder: () => void;
  onRename: () => void;
  onMove: () => void;
  onDelete: () => void;
}

export function FolderActionsMenu({ onNewSubfolder, onRename, onMove, onDelete }: FolderActionsMenuProps) {
  const { isAdmin } = useAuth();

  if (!isAdmin) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <button
          type="button"
          className="shrink-0 rounded p-0.5 text-text-tertiary hover:bg-surface-base hover:text-text-secondary"
          aria-label="Folder actions"
        >
          <DotsThreeIcon size={14} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={onNewSubfolder}>
          <FolderPlusIcon size={14} className="mr-2" />
          New subfolder
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onRename}>
          <PencilSimpleIcon size={14} className="mr-2" />
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onMove}>
          <FolderSimpleIcon size={14} className="mr-2" />
          Move to...
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDelete} className="text-status-critical">
          <TrashIcon size={14} className="mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
