# @autonoma/workflow

Typed builder library for creating and submitting Argo Workflows on Kubernetes. Provides type-safe DAG construction, template builders, and trigger functions for all Autonoma workflow types (test generation, replay, diffs, review).

## Package Structure

```
src/
├── index.ts                          # Public exports
├── env.ts                            # Environment variables (NAMESPACE, DATABASE_URL)
├── k8s/
│   ├── argo/
│   │   ├── argo-types.ts             # Argo JSON type definitions
│   │   ├── dag-builder.ts            # Type-safe DAG builder (DagBuilder, TaskHandle)
│   │   └── templates/
│   │       ├── template.ts           # Base template abstraction (TemplateInput, argoTemplate)
│   │       ├── container-template.ts # Container templates (with outputs)
│   │       ├── job-template.ts       # K8s Job resource templates
│   │       └── dag-template.ts       # Sub-DAG templates
│   ├── container.ts                  # imageContainer() - resolves image from ConfigMap
│   ├── image-keys.ts                 # Image key + secret file name types
│   ├── job.ts                        # job() - builds V1Job with standard metadata
│   ├── job-namespaces.ts             # JobNamespace type ("web" | "mobile" | "argo")
│   └── k8s-client.ts                # K8sClient - creates workflows, queries, resolves images
└── workflows/                        # Workflow definitions (trigger functions + templates)
    ├── test-plan-generation.ts       # triggerTestPlanWorkflow
    ├── batch-generation.ts           # triggerBatchGeneration
    ├── run-replay.ts                 # triggerRunWorkflow
    ├── diffs/                        # triggerDiffsJob
    ├── generation-reviewer/          # triggerGenerationReviewWorkflow
    └── replay-reviewer/              # triggerReplayReviewWorkflow
```

## Exports

```ts
// Trigger functions - submit Argo workflows to K8s
triggerTestPlanWorkflow(params: TriggerTestPlanWorkflowParams): Promise<void>
triggerBatchGeneration(params: TriggerBatchGenerationParams): Promise<void>
triggerRunWorkflow(params: TriggerRunWorkflowParams): Promise<void>
triggerDiffsJob(params: TriggerDiffsJobParams): Promise<void>
triggerGenerationReviewWorkflow(/* ... */): Promise<void>
triggerReplayReviewWorkflow(/* ... */): Promise<void>

// Query functions
findLatestWorkflowByGenerationId(generationId: string): Promise<ArgoWorkflowRef | undefined>
findLatestWorkflowByRunId(runId: string): Promise<{ name: string; uid: string } | undefined>

// Types
type TriggerTestPlanWorkflowParams
type TriggerBatchGenerationParams
type TriggerRunWorkflowParams
type TriggerDiffsJobParams
type TestPlanItem
type WorkflowArchitecture  // "WEB" | "IOS" | "ANDROID"
type ArgoWorkflowRef       // { name, uid }
```

## Usage

```ts
import {
  triggerTestPlanWorkflow,
  triggerBatchGeneration,
  triggerRunWorkflow,
} from "@autonoma/workflow";

// Trigger test generation for multiple test plans
await triggerTestPlanWorkflow({
  testPlans: [
    { testGenerationId: "gen-1", scenarioId: "scenario-1" },
    { testGenerationId: "gen-2" },
  ],
  agentVersion: "1.0.0",
  architecture: "WEB",
});

// Batch generation with auto-assignment after all complete
await triggerBatchGeneration({
  testPlans: [{ testGenerationId: "gen-1", scenarioId: "scenario-1" }],
  agentVersion: "1.0.0",
  architecture: "WEB",
  autoActivate: true,
});

// Trigger a run replay workflow
await triggerRunWorkflow({
  runId: "run-123",
  architecture: "web",
  agentVersion: "1.0.0",
  scenarioId: "scenario-1", // optional - adds scenario up/down steps
});
```

## Architecture

### DAG Builder

The core abstraction is `DagBuilder` - a type-safe builder for Argo DAG workflows. It enforces correct parameter passing between templates at the type level.

```ts
const dag = new DagBuilder("my-workflow", {
  inputA: "input-a",  // maps logical key to Argo parameter name
});

// Register a template, get a typed TemplateRef back
const templateRef = dag.addTemplate(someTemplateData);

// Add a task using the template - args are type-checked against the template's inputs
const task = dag.addTask({
  name: "step-1",
  template: templateRef,
  args: { inputA: dag.input("inputA") },
});

// Reference task outputs and status in dependency expressions
dag.addTask({
  name: "step-2",
  template: otherRef,
  args: { previousResult: task.output("resultKey") },
  depends: task.succeeded,  // "step-1.Succeeded"
});

const dagData = dag.build(); // produces ArgoDagData for K8sClient.createWorkflow()
```

### Template Types

Three template builders via `argoTemplates`:

- **`argoTemplates.job()`** - creates a K8s Job resource. No outputs. Used for execution agents.
- **`argoTemplates.container()`** - runs a container directly. Supports output parameters. Used for scenarios.
- **`argoTemplates.dag()`** - wraps a sub-DAG as a template. Used for nesting DAGs.

### Image Resolution

Container images are resolved at workflow build time from a K8s ConfigMap (`image-version`). The `imageContainer()` helper handles image lookup, secret mounting, and shared env injection.

### K8sClient

Singleton `K8sClient` handles all K8s API interactions:

- `createWorkflow()` - submits an Argo Workflow custom resource
- `queryWorkflows()` - lists workflows by label selector
- `getImage()` - resolves image tag from ConfigMap

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NAMESPACE` | Yes | K8s namespace for ConfigMap lookups |
| `DATABASE_URL` | Yes | Injected into workflow containers |
| `SENTRY_ENV` | No | Sentry environment tag for containers |

## Dependencies

- `@autonoma/k8s` - K8s utility helpers
- `@autonoma/logger` - Structured logging
- `@autonoma/types` - Shared types (Architecture enum)
- `@kubernetes-models/argo-workflows` - Argo CRD types
- `@kubernetes/client-node` - K8s API client
