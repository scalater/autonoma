import z from "zod";

export const imageVersionConfigSchema = z.object({
    "execution-agent-web": z.string(),
    "execution-agent-mobile": z.string(),
    "workflow-scenario": z.string(),
    "generation-assigner": z.string(),
    diffs: z.string(),
    "generation-reviewer": z.string(),
    "run-completion-notification": z.string(),
    "replay-reviewer": z.string(),
});

export type ImageVersionConfig = z.infer<typeof imageVersionConfigSchema>;
export type ImageKey = keyof ImageVersionConfig;

/**
 * Valid names for argo workflow secrets
 *
 * See `deployment/argo/deployment.yaml` `ExternalSecret` records for reference
 */
export type SecretFileName =
    | "execution-agent-file"
    | "scenario-manager-file"
    | "generation-assigner-file"
    | "diffs-env-file"
    | "generation-reviewer-file"
    | "run-completion-notification-file"
    | "replay-reviewer-file";
