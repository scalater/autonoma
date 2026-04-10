---
title: "Step 4: Environment Factory"
description: "Implement or complete the Environment Factory, then validate the planned scenarios against its lifecycle."
---

:::note[We're simplifying this]
We know the current scenario setup is more complex than it needs to be. We're actively working on a much simpler version that should be ready in the next couple of weeks. In the meantime, the process below still works.
:::

The Step 4 agent works against your backend. It does two things in the same step:

- implement or complete the Autonoma Environment Factory
- validate the planned scenarios against that implementation

In practice, this means Step 4:

- preserves or finishes the `discover` integration already used by [Step 2](/test-planner/step-2-scenarios/)
- implements or fixes `up` and `down` so the backend can create and clean up isolated test data
- smoke-tests the lifecycle
- validates `standard`, `empty`, and `large`
- writes `autonoma/scenario-recipes.json` as the approved recipe layer for later automation

If the backend already has part of the SDK wired in, Step 4 should extend that integration rather than replacing it. If the backend has only a small integration gap, Step 4 can fix that. But the step still owns the full Environment Factory outcome: implementation plus validation.

## Prerequisites

- `autonoma/discover.json` must exist (output from [Step 2](/test-planner/step-2-scenarios/))
- `autonoma/scenarios.md` must exist (output from [Step 2](/test-planner/step-2-scenarios/))
- Your application's backend codebase must be open in the workspace, or a working Environment Factory endpoint must be reachable
- Optionally, the `qa-tests/` directory from [Step 3](/test-planner/step-3-e2e-tests/) helps confirm what data the tests will need

## Environment requirements

The current SDK contract uses these secrets:

- `AUTONOMA_SHARED_SECRET` - shared HMAC secret used to verify incoming requests
- `AUTONOMA_SIGNING_SECRET` - private secret used to sign and verify teardown refs

If Step 4 validates through the live HTTP endpoint, the Claude Code session also needs:

- `AUTONOMA_SDK_ENDPOINT`

If the backend exposes the SDK directly in-process, Step 4 should prefer local SDK-backed checks instead of external HTTP calls.

## What this produces

- A working Environment Factory route or handler that supports:
  - `discover`
  - `up`
  - `down`
- Any targeted backend fixes needed to make the lifecycle work cleanly
- `autonoma/scenario-recipes.json` - the approved recipes for `standard`, `empty`, and `large`
- Validation evidence showing which strategy was used:
  - SDK-backed `checkScenario` / `checkAllScenarios`
  - or signed `discover` / `up` / `down` endpoint calls

## Review checkpoint

Before writing code, the agent should present an implementation plan. This is the last approval gate in the plugin.

**What to check:**

- **Endpoint location** - Does the plan place the Environment Factory in the correct backend app, package, or route?
- **Reuse vs replacement** - If `discover` already works, the plan should preserve that path and finish `up` / `down`, not rewrite everything blindly.
- **Security model** - The plan should use `AUTONOMA_SHARED_SECRET` and `AUTONOMA_SIGNING_SECRET`, not ad hoc secret names.
- **Entity creation order** - Parents must be created before children, and teardown must remove children before parents or otherwise rely safely on the SDK's teardown logic.
- **Variable field handling** - Generated values from Step 2 must remain generated in the recipe. The plan should not collapse `{{project_title}}` back into a fixed literal.
- **Validation strategy** - The plan should say how it will validate `standard`, `empty`, and `large` after the Environment Factory wiring is ready.
- **Rollback claims** - If the plan says "dry run" or "transaction rollback," make sure the backend actually implements that. Otherwise it should describe this correctly as create-then-clean validation.

:::tip
If you're unsure about the protocol details, read the [Environment Factory Guide](/guides/environment-factory/) before reviewing the plan. The guide covers the current SDK request/response format, security model, and validation options.
:::

## The prompt

<details>
<summary>Expand full prompt</summary>

# Environment Factory Generator

You are a backend engineer. Your job is to implement or complete the Autonoma Environment Factory in the application's backend, then validate the Step 2 scenarios against that implementation.

The goal is to:

1. read `discover.json` and `scenarios.md`
2. locate or implement the Environment Factory route
3. make sure `discover`, `up`, and `down` work with the current SDK contract
4. smoke-test the lifecycle
5. validate `standard`, `empty`, and `large`
6. persist approved recipes to `autonoma/scenario-recipes.json`

Do not treat this as a pure planning step. Step 4 owns the backend outcome.

---

## Phase 0: Locate prerequisites

### 0.1 - Find the Step 2 artifacts

1. Check for `autonoma/discover.json` and `autonoma/scenarios.md` at the workspace root.
2. If not found, search broadly for both files anywhere in the workspace.

If either file is missing, tell the user:

> "I need both `discover.json` and `scenarios.md` to implement and validate the Environment Factory. Please run Step 2 first, then come back and run this prompt."

Do not proceed without them.

### 0.2 - Read the Environment Factory documentation

Fetch the Autonoma documentation to understand the current protocol:

1. Fetch `https://docs.agent.autonoma.app/llms.txt` to get the documentation index
2. Read the **Environment Factory Guide** - understand the current `discover`, `up`, and `down` actions, the security model, and the SDK-backed validation model
3. Read the framework example that matches this project's stack if one exists

**Always read the live docs.** The docs at `https://docs.agent.autonoma.app` are the source of truth.

### 0.3 - Read discover.json and scenarios.md

Read both files fully. Identify:

- the schema models, edges, relations, and scope field from `discover.json`
- the three scenario names (`standard`, `empty`, `large`) and their descriptions
- every entity type in the `standard` scenario, with exact counts and relationships
- the `large` scenario's volume requirements
- every generated variable token and what field it maps to

---

## Phase 1: Understand the codebase and Environment Factory surface

### 1.1 - Check backend access

Before anything else, determine if the backend codebase is accessible in this workspace.

If the backend is not accessible and there is no reachable Environment Factory endpoint, tell the user:

> "I don't have access to your backend codebase or a reachable Environment Factory endpoint, so I can't complete Step 4. The Environment Factory implementation and validation need one of those to be available."

Do not proceed without one of them.

### 1.2 - Confirm Environment Factory availability

Search for:

- SDK packages and adapters
- the mounted Environment Factory route or handler
- configuration for `sharedSecret` and `signingSecret`
- any local helper that wraps `checkScenario` or `checkAllScenarios`

If the SDK integration is missing entirely, continue with implementation planning.

If part of the SDK is already present, preserve what works and focus on the missing pieces.

### 1.3 - Explore the creation patterns

After confirming the backend surface:

- map every entity in `scenarios.md` to its database table or model
- identify any unique fields that must remain generated
- identify parent/child creation order from the schema relationships
- find any existing seed helpers, factories, or test helpers worth reusing
- determine whether the backend can run SDK-backed checks locally or whether you need signed endpoint calls

**Use subagents to parallelize exploration.** One for the schema and models, one for the SDK integration, one for existing entity creation helpers.

---

## Phase 2: Plan - go into plan mode

Before writing any code, present a complete implementation plan to the user:

```text
## Environment Factory Plan

### Backend surface
[Exact file path(s) or endpoint URL(s) that will be used]

### Current state
[What already exists vs what is missing]

### Security
- AUTONOMA_SHARED_SECRET
- AUTONOMA_SIGNING_SECRET

### Scenario inputs
- discover source: [path]
- scenarios source: [path]
- scenario names: standard, empty, large

### Variable field handling
- [token] -> [entity field] -> [generator or runtime derivation note]

### Implementation order
1. ...
2. ...

### Validation order
1. smoke test discover/up/down
2. validate standard
3. validate empty
4. validate large

### Outputs
- backend route / handler changes
- `autonoma/scenario-recipes.json`

### Risk notes
- [e.g. unique constraints, missing auth callback, uncertain rollback support]
```

**Wait for the user to approve before proceeding.** Do not write code until the plan is approved.

---

## Phase 3: Implement and validate

Implement in this order.

### 3.1 - Implement or complete the Environment Factory

Make sure the backend exposes or preserves:

- `discover`
- `up`
- `down`

Use the current SDK secret names:

- `AUTONOMA_SHARED_SECRET`
- `AUTONOMA_SIGNING_SECRET`

If `discover` already works, do not rewrite it without a reason.

### 3.2 - Smoke-test the lifecycle

Before validating the planned scenarios, confirm the Environment Factory wiring works:

1. confirm `discover` works
2. send one signed `up` request with a small compatible `create` payload
3. send the corresponding signed `down` request
4. confirm cleanup succeeds

### 3.3 - Validate the planned scenarios

After the wiring works, validate `standard`, `empty`, and `large`.

Prefer:

- `checkScenario`
- `checkAllScenarios`

If those local checks are not available, validate through the signed HTTP endpoint with real `up` -> `down` requests.

### 3.4 - Persist approved recipes

Write `autonoma/scenario-recipes.json`.

Each recipe must preserve:

- scenario name and description
- explicit relation paths
- fixed values that tests can assert directly
- generated placeholders for fields that must remain dynamic

Do not collapse generated placeholders back into hardcoded literals.

### 3.5 - Re-test after every backend fix

If Step 4 requires backend changes:

- make the smallest change that fixes the issue
- re-run the smoke test
- re-run scenario validation

---

## Required final summary

When finished, report:

1. where the Environment Factory lives in the backend
2. what was implemented or fixed
3. which secrets are required
4. whether the smoke lifecycle passed
5. whether `standard`, `empty`, and `large` validated successfully
6. where `autonoma/scenario-recipes.json` was written

</details>
