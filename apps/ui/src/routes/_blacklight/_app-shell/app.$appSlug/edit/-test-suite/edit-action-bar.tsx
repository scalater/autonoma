import { Button } from "@autonoma/blacklight";
import { useDiscardEdit, useEditSession, useFinalizeEdit } from "lib/query/snapshot-edit.queries";
import { useAppNavigate } from "../../../-use-app-navigate";

export function EditActionBar({ branchId }: { branchId: string }) {
  const { data: session } = useEditSession(branchId);
  const appNavigate = useAppNavigate();

  const finalizeEdit = useFinalizeEdit();
  const discardEdit = useDiscardEdit();

  const navigateBack = () => {
    void appNavigate({ to: "/app/$appSlug/tests" });
  };

  const isActing = finalizeEdit.isPending || discardEdit.isPending;

  return (
    <div className="mt-4 flex items-center justify-between border-t border-border-mid pt-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => discardEdit.mutate({ branchId }, { onSuccess: navigateBack })}
        disabled={isActing}
      >
        {discardEdit.isPending ? "Discarding..." : "Discard"}
      </Button>

      <Button
        size="sm"
        onClick={() => finalizeEdit.mutate({ branchId }, { onSuccess: navigateBack })}
        disabled={session.hasIncompleteGenerations || isActing}
      >
        {finalizeEdit.isPending ? "Committing..." : "Commit"}
      </Button>
    </div>
  );
}
