import { FolderRow } from "./folder-row";
import { TestRow } from "./test-row";
import type { ChildNode } from "./tree-types";

interface ChildRowProps {
  node: ChildNode;
  level: number;
  siblingFolderIds: string[];
}

export function ChildRow({ node, level, siblingFolderIds }: ChildRowProps) {
  if ("children" in node) {
    return <FolderRow node={node} level={level} siblingFolderIds={siblingFolderIds} />;
  }

  return <TestRow node={node} level={level} />;
}
