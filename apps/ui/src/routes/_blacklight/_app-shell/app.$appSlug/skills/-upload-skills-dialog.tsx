import {
  Button,
  Dialog,
  DialogBackdrop,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@autonoma/blacklight";
import { UploadSimpleIcon } from "@phosphor-icons/react/UploadSimple";
import { XIcon } from "@phosphor-icons/react/X";
import { useCreateBulkSkills } from "lib/query/skills.queries";
import { useRef, useState } from "react";
import { useCurrentApplication } from "../../-use-current-application";

interface UploadSkillsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadSkillsDialog({ open, onOpenChange }: UploadSkillsDialogProps) {
  const currentApp = useCurrentApplication();
  const [files, setFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const createBulkSkills = useCreateBulkSkills();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length === 0) return;
    const existingNames = new Set(files.map((f) => f.name));
    setFiles((prev) => [...prev, ...selected.filter((f) => !existingNames.has(f.name))]);
    e.target.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) return;

    const formData = new FormData();
    formData.append("applicationId", currentApp.id);
    for (const file of files) {
      formData.append("file", file);
    }

    createBulkSkills.mutate(formData, {
      onSuccess: () => {
        setFiles([]);
        onOpenChange(false);
      },
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setFiles([]);
        onOpenChange(nextOpen);
      }}
    >
      <DialogBackdrop />
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Upload skills</DialogTitle>
          </DialogHeader>

          <DialogBody className="flex flex-col gap-3">
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".md,.markdown,text/markdown"
              className="sr-only"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex h-9 w-full items-center gap-2 border border-dashed border-border-mid bg-transparent px-3 font-mono text-2xs text-text-secondary transition-colors hover:border-border-highlight hover:text-text-primary"
            >
              <UploadSimpleIcon size={14} className="shrink-0" />
              {files.length === 0 ? "Upload markdown files" : "Add more files"}
            </button>
            {files.length > 0 && (
              <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto">
                {files.map((file, i) => (
                  <li
                    key={file.name}
                    className="flex items-center gap-2 border border-border-dim bg-surface-base px-3 py-1.5 font-mono text-2xs text-text-secondary"
                  >
                    <span className="flex-1 truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="shrink-0 text-text-tertiary transition-colors hover:text-text-primary"
                    >
                      <XIcon size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </DialogBody>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={files.length === 0 || createBulkSkills.isPending}>
              {createBulkSkills.isPending
                ? "Uploading..."
                : `Upload ${files.length > 0 ? files.length : ""} skill${files.length !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
