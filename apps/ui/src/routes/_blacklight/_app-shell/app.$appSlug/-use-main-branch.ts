import { useBranchDetail } from "lib/query/branches.queries";
import { useCurrentApplication } from "../-use-current-application";

export function useMainBranch() {
    const app = useCurrentApplication();
    if (app.mainBranch == null) throw new Error("Application has no main branch");
    return useBranchDetail(app.id, app.mainBranch.name).data;
}

export function useCurrentSnapshot() {
    const branch = useMainBranch();
    return branch.activeSnapshot;
}
