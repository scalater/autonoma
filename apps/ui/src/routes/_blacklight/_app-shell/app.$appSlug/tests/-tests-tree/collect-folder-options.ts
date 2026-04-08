import type { FolderRecord } from "./tree-types";

export interface FolderOption {
    id: string;
    name: string;
    depth: number;
}

export function collectFolderOptions(folders: FolderRecord[], excludeFolderIds?: Set<string>): FolderOption[] {
    const options: FolderOption[] = [{ id: "__root__", name: "/", depth: 0 }];

    const byParent = new Map<string | null, FolderRecord[]>();
    for (const folder of folders) {
        const key = folder.parentId;
        const list = byParent.get(key);
        if (list != null) {
            list.push(folder);
        } else {
            byParent.set(key, [folder]);
        }
    }

    function walk(parentId: string | null, depth: number) {
        const children = byParent.get(parentId);
        if (children == null) return;
        for (const child of children) {
            if (excludeFolderIds?.has(child.id)) continue;
            options.push({ id: child.id, name: child.name, depth });
            walk(child.id, depth + 1);
        }
    }

    walk(null, 0);
    return options;
}
