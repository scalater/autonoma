import { cn } from "@autonoma/blacklight";
import { FileTextIcon } from "@phosphor-icons/react/FileText";
import { WarningCircleIcon } from "@phosphor-icons/react/WarningCircle";
import { TestActionsMenu } from "./test-actions-menu";
import { useTestsTree } from "./tests-tree-context";
import type { TestCaseRecord } from "./tree-types";

interface TestRowProps {
  node: TestCaseRecord;
  level: number;
}

export function TestRow({ node, level }: TestRowProps) {
  const { selectedTestSlug, selectTest, openRename, openDeleteTest } = useTestsTree();
  const isSelected = selectedTestSlug === node.slug;
  const isFailed = node.hasSteps === false;

  return (
    <button
      onClick={() => selectTest(node.slug)}
      type="button"
      data-test-slug={node.slug}
      className={cn(
        "group flex w-full items-center gap-1.5 py-1.5 pr-2 text-left text-sm transition-colors hover:bg-surface-base",
        isSelected && "bg-surface-base",
      )}
      style={{ paddingLeft: `${level * 16 + 12}px` }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
        <span className="w-4 shrink-0" />
        {isFailed ? (
          <WarningCircleIcon size={14} className="shrink-0 text-primary-ink" />
        ) : (
          <FileTextIcon size={14} className="shrink-0 text-text-tertiary" />
        )}
        <span
          className={cn(
            "truncate",
            isFailed ? "text-primary-ink" : isSelected ? "font-medium text-text-primary" : "text-text-secondary",
          )}
        >
          {node.name}
        </span>
      </div>
      <TestActionsMenu
        onRename={() => openRename("test", node.slug, node.name)}
        onDelete={() => openDeleteTest(node.slug, node.name)}
      />
    </button>
  );
}
