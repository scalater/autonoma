---
title: "Step 4: Implement Scenarios"
description: "Implement the Environment Factory endpoint that creates and tears down isolated test data for each scenario."
---

:::note[We're simplifying this]
We know the current scenario setup is more complex than it needs to be. We're actively working on a much simpler version that should be ready in the next couple of weeks. In the meantime, the process below still works - but expect it to get significantly easier soon.
:::

The scenario implementer takes your `scenarios.md` and builds the Environment Factory endpoint - the `discover`, `up`, and `down` actions that Autonoma calls to create and tear down isolated test data before and after each run. It reads the [Environment Factory protocol](/guides/environment-factory/) and follows the example for your framework.

## Prerequisites

- `autonoma/scenarios.md` must exist (output from [Step 2](/test-planner/step-2-scenarios/))
- Your application's **backend codebase** must be open in the workspace. If it's in a separate repository from the frontend, make sure it's accessible - the agent will ask you to point to it. This is where the endpoint code will be written.
- Optionally, the `qa-tests/` directory from [Step 3](/test-planner/step-3-e2e-tests/) (helps understand what data the tests will need, but not strictly required)

## Generating the secrets

The implementation requires **two separate secrets** with different purposes. Generate them before you start:

```bash
# 1. Signing secret - you AND Autonoma both know this one.
#    Autonoma uses it to sign every request (HMAC-SHA256).
#    Your endpoint uses it to verify the signature.
#    You'll paste this into the Autonoma dashboard when connecting your app.
openssl rand -hex 32
# Example output: 4a8f...  → set as AUTONOMA_SIGNING_SECRET

```

This produces a 64-character hex string (256 bits of entropy). For more details on the security model, see the [Security Model](/guides/environment-factory/#security-model) in the Environment Factory Guide.

## What this produces

- Working implementation of the `discover`, `up`, and `down` endpoint actions in your application's codebase
- Integration tests covering the full lifecycle (create data, verify, tear down, verify clean)
- A curl test script for manual verification

## Review checkpoint

Before writing any code, the agent will present a full implementation plan. This is a standard plan-mode approval gate - review it before the agent proceeds.

**What to check:**

- **Entity creation order** - Parents must be created before children. If the plan says "create Tests before Applications" but tests reference applications, the order is wrong.
- **Teardown order** - Must be the reverse of creation. Children before parents. If the plan deletes an organization before its users, it will fail on foreign key constraints.
- **Auth strategy** - Does the plan correctly identify how your app authenticates users? If you use session cookies, the `up` response should return a cookie. If JWT, a token.
- **Security implementation** - HMAC-SHA256 signature verification, JWT signed refs, and a production guard (endpoint returns 404 unless explicitly enabled) should all be present.
- **Environment variables** - The plan should list `AUTONOMA_SIGNING_SECRET` (used for both HMAC request verification and refs token signing).

:::tip
If you're unsure about the protocol details, read the [Environment Factory Guide](/guides/environment-factory/) before reviewing the plan. The guide covers the full security model, request/response format, and teardown rules.
:::

## The prompt

<details>
<summary>Expand full prompt</summary>

# Environment Factory Scenario Implementer

You are a backend engineer. Your job is to implement the Autonoma Environment Factory endpoint for this application, using the scenarios defined in `scenarios.md` to populate each environment with concrete test data.

---

## Phase 0: Locate prerequisites

### 0.1 - Find scenarios.md

1. Check for `autonoma/scenarios.md` at the workspace root.
2. If not found, search broadly for `scenarios.md` anywhere in the workspace.

If not found, tell the user:

> "I need `scenarios.md` to implement the Environment Factory. Please run the Scenario Generator (Step 2) first, then come back and run this prompt."

Do not proceed without it.

### 0.2 - Read the Environment Factory documentation

Fetch the Autonoma documentation to understand the current protocol:

1. Fetch `https://docs.agent.autonoma.app/llms.txt` to get the documentation index
2. Read the **Environment Factory Guide** - understand the `discover`, `up`, and `down` actions, the security model (HMAC-SHA256 signatures, signed JWT refs), and the teardown rules
3. Read the **framework example** that matches this project's stack (Next.js, React+Vite, Elixir/Phoenix, TanStack Start) if one exists

**Always read the live docs.** The protocol may have been updated since this prompt was written. The docs at `https://docs.agent.autonoma.app` are the source of truth.

### 0.3 - Read scenarios.md

Read `scenarios.md` fully. Identify:

- The three scenario names (`standard`, `empty`, `large`) and their descriptions
- Every entity type in the `standard` scenario, with exact counts and relationships
- The credentials format (organization name, user email/password, role)
- The `large` scenario's volume requirements (what counts exceed pagination thresholds)
- Any special entity relationships or ordering constraints

---

## Phase 1: Understand the codebase

### 1.1 - Check backend access

Before anything else, determine if the backend codebase is accessible in this workspace. Search for common backend indicators: database schema files (`schema.prisma`, `drizzle/`, SQL migrations), server entry points, API route directories, or `package.json` files with backend dependencies.

**If the backend is NOT accessible:**

Do not attempt to implement the endpoint. Instead, tell the user:

> "I don't have access to your backend codebase, so I can't implement the Environment Factory directly. Instead, here's a prompt you can copy and run in your backend workspace. It has everything the agent needs - your scenarios, the protocol docs, and full implementation instructions."

Then generate a **self-contained prompt** the user can copy and paste into a coding agent running on their backend. The prompt must include:

1. **The full contents of `scenarios.md`** - inline the entire file so the backend agent has all entity types, counts, relationships, and credentials
2. **The full contents of `AUTONOMA.md`** - inline it so the backend agent understands the application's flows and pages
3. **A link to the live documentation**: "Fetch `https://docs.agent.autonoma.app/llms.txt` to get the documentation index. Read the Environment Factory Guide for the full protocol (discover/up/down actions, HMAC-SHA256 security, signed JWT refs, teardown rules). Read the framework example that matches your stack if one exists."
4. **All implementation instructions from Phase 2 onward** of this prompt (plan, implement, verify) - so the backend agent has the complete playbook
5. **The test script command** to verify the implementation: `curl -fsSL https://docs.agent.autonoma.app/test-scenario.sh | bash -s -- --url [ENDPOINT_URL] --secret [AUTONOMA_SIGNING_SECRET] --scenario standard`

Format the prompt as a single fenced code block the user can copy. Do not proceed with the remaining phases - the user will run it themselves on their backend.

**If the backend IS accessible**, continue to Phase 1.2.

### 1.2 - Ask the user

Before exploring the codebase, ask the user these questions:

> "Before I implement the Environment Factory, I need to understand a few things about your backend:
>
> 1. **Where should I add this endpoint?** If you have a preferred location (e.g., `src/app/api/autonoma/route.ts`, `server/routes/autonoma.ts`), let me know. Otherwise I'll look at your existing route structure and suggest a spot.
> 2. **What's your backend framework and language?** (e.g., Next.js, Express, Fastify, NestJS, Rails, Django, Phoenix - I'll try to detect this, but confirm so I get it right)
> 3. **What's your database access layer?** (e.g., Prisma, Drizzle, raw SQL, Sequelize, TypeORM, Ecto)
> 4. **What's your auth mechanism?** How do users log in? (session cookies, JWT in header, OAuth - this determines what `up` returns in the `auth` field)
> 5. **Do you have an existing signing secret I should reuse**, or should I generate a new environment variable?
>
> If you're unsure about any of these, just say so and I'll explore your codebase to figure it out."

Wait for the user's answers before proceeding. If the user is uncertain about the endpoint location or framework conventions, explore the codebase to determine the right placement and patterns before proposing a plan.

### 1.3 - Explore the codebase

After getting the user's answers:

- **Find the database schema** - Prisma `schema.prisma`, Drizzle schema files, SQL migrations, or equivalent
- **Map every entity in `scenarios.md` to its database table/model** - confirm they all exist and note any field name differences between the scenario and the schema
- **Identify entity creation patterns** - find existing code that creates entities (seed files, test helpers, API handlers). Reuse the same patterns, imports, and conventions
- **Understand the auth creation flow** - how does a session or token get created for a user? Find the login handler or session creation code
- **Check for circular foreign keys** - if any tables reference each other bidirectionally, you'll need the transaction + constraint drop pattern for teardown

**Use subagents to parallelize exploration.** One for the database schema, one for existing entity creation patterns, one for auth flow.

---

## Phase 2: Plan - go into plan mode

Before writing any code, present a complete implementation plan to the user:

```
## Implementation Plan

### Endpoint location
[Exact file path where the endpoint will be created or updated]

### Framework integration
[How the endpoint fits into the existing request/response pattern - middleware, route registration, etc.]

### Environment variables (two secrets with different purposes)
- `AUTONOMA_SIGNING_SECRET` - Signing secret used for both HMAC-SHA256 request verification and refs token signing. **Shared between your server and Autonoma** - you paste this value into the Autonoma dashboard when connecting your app. Generate with: `openssl rand -hex 32`
- `AUTONOMA_ENABLED` - Feature flag (endpoint returns 404 when not set in production)

### Security implementation
- HMAC-SHA256 signature verification on every request (uses `AUTONOMA_SIGNING_SECRET`)
- Signed refsToken (24h expiry) containing created entity IDs (uses `AUTONOMA_SIGNING_SECRET`)
- Production guard: returns 404 unless AUTONOMA_ENABLED=true or NODE_ENV != production

### Auth strategy
[Based on user's answer - what the `up` response returns in the `auth` field]

### Scenario: standard
Create order (parents first):
1. Organization - name: "[org name from scenario] - {testRunId}"
2. User - email: "test-{testRunId}@example.com", role: [role from scenario]
3. [Entity type 2] - [count] items: [brief description]
4. ...

Teardown order (reverse):
1. ...
2. User
3. Organization

### Scenario: empty
Create order:
1. Organization
2. User

Teardown order:
1. User
2. Organization

### Scenario: large
[Summary - which entities differ from standard and by how much]
Create order: [same structure as standard]
Teardown order: [reverse]

### Fingerprinting
[How the fingerprint is computed - descriptor string containing entity types, counts, and field names, hashed to 16-char hex]
```

**Wait for the user to approve before proceeding.** Do not write code until the plan is approved.

---

## Phase 3: Implement

Implement in this exact order. Each piece should be a commit-ready unit.

### 3.1 - Types and schemas

Define the request/response types for all three actions. Use the project's existing validation approach (Zod, io-ts, custom validators, or framework-native validation).

- Discriminated union for `discover | up | down` request bodies
- Response shapes for each action
- Refs token payload type

### 3.2 - Security utilities

- **HMAC verification helper** - validates the `x-signature` header against the request body using `AUTONOMA_SIGNING_SECRET` (the secret shared with Autonoma). Use constant-time comparison.
- **Token sign/verify for refs** - signs a payload with entity IDs on `up`, verifies on `down`, using `AUTONOMA_SIGNING_SECRET`. Include `testRunId` in the payload. Set 24h expiry.
- **Production guard** - middleware or early return that returns 404 when `AUTONOMA_ENABLED` is not set and the environment is production.

### 3.3 - Scenario builders

Create one builder per scenario. Each builder implements:

- `name` - the scenario name string
- `description` - one-sentence description
- `computeFingerprint()` - deterministic 16-char hex hash of the scenario's data structure descriptor. The descriptor includes entity types, counts, and field names. **No timestamps or random values** - the fingerprint must be stable across calls.
- `up(testRunId: string)` - creates all entities in order, returns `{ auth, refs }` where `refs` contains the IDs of all created entities
- `down(refs)` - deletes all entities in reverse order using the refs from `up`

### 3.4 - Standard scenario

The main builder. For each entity type in `scenarios.md`:

1. Create entities in the order defined by entity dependencies (parents before children)
2. Use `testRunId` to make all unique fields unique across parallel runs (e.g., email: `test-{testRunId}@example.com`, org name: `Standard Test Org - {testRunId}`)
3. Set all fields to match the exact values in `scenarios.md` (names, statuses, types, counts)
4. Track all created entity IDs in the refs object

### 3.5 - Empty scenario

Minimal: create only the organization and user. All other entity types have zero items.

### 3.6 - Large scenario

Reuse the standard scenario's creation logic but with higher counts. For entities where the `large` scenario specifies different volumes, scale up. Use loops for bulk creation - don't write 120 individual create calls.

### 3.7 - Scenario registry

A simple map from scenario name to builder instance. The endpoint handler looks up the scenario by name from the request.

### 3.8 - Endpoint handler

The main endpoint. Routes the `action` field to the right handler:

- **`discover`** - verify signature, return list of all scenarios with names, descriptions, and fingerprints
- **`up`** - verify signature, look up scenario by name, call `up(testRunId)`, sign refs into a JWT, return `{ auth, refsToken }`
- **`down`** - verify signature, verify and decode the refs JWT, call `down(refs)`

Follow the existing codebase patterns exactly. If the app uses a service class pattern, create a service. If it uses plain handler functions, use handler functions. Match the existing import style, error handling pattern, and file organization.

---

## Phase 4: Verify

### 4.1 - Integration tests

Write integration tests using the project's existing test framework. Cover:

- `discover` returns all three scenarios with 16-char hex fingerprints
- Fingerprints are stable across calls (call twice, compare)
- `up standard` creates the correct entity counts (query the DB after `up` and verify counts match `scenarios.md`)
- `up empty` creates only organization + user
- `down` deletes all created entities (query the DB after `down` and verify zero orphans)
- Full lifecycle: `up` -> verify data exists -> `down` -> verify data is gone
- Security: tampered signature -> 403
- Security: missing signature -> 401
- Security: unknown scenario name -> 400
- Security: tampered refs token -> 403

### 4.2 - Run the test script

Test the endpoint end-to-end using Autonoma's test script. Run it against each scenario:

```bash
curl -fsSL https://docs.agent.autonoma.app/test-scenario.sh | bash -s -- \
  --url [ENDPOINT_URL] \
  --secret [AUTONOMA_SIGNING_SECRET] \
  --scenario standard
```

The script runs `discover` -> `up` -> `down` and validates every response. Run it for each scenario (`standard`, `empty`, `large`) to confirm the full lifecycle works.

If a scenario fails, read the error output - it shows the exact request, response, and validation failure. Fix the issue and re-run.

If the endpoint is running locally, use `--url http://localhost:[PORT]/api/autonoma` (or wherever you placed it). Ask the user for the URL and signing secret if you don't know them.

### 4.3 - Report to the user

Tell the user:

> "Done! I've implemented the Environment Factory at `[endpoint path]` with three scenarios:
>
> - `standard`: [brief summary of what it creates]
> - `empty`: Organization + user only
> - `large`: [brief summary]
>
> **Next steps:**
> 1. Generate and set the signing secret:
>    ```
>    openssl rand -hex 32  # use output for AUTONOMA_SIGNING_SECRET
>    ```
> 2. Run the integration tests: `[test command]`
> 3. Test the endpoint end-to-end with Autonoma's test script:
>    ```
>    curl -fsSL https://docs.agent.autonoma.app/test-scenario.sh | bash -s -- \
>      --url [ENDPOINT_URL] --secret [AUTONOMA_SIGNING_SECRET] --scenario standard
>    ```
> 4. Share the endpoint URL with Autonoma to connect your application
>
> The integration tests cover the full lifecycle and security model from the [Environment Factory Guide](https://docs.agent.autonoma.app/guides/environment-factory/)."

---

## Important reminders

- **Always fetch the live docs at `https://docs.agent.autonoma.app/llms.txt` before implementing.** The Environment Factory protocol may have been updated since this prompt was written. The docs are the source of truth for request/response formats, security requirements, and teardown rules.
- **Use `testRunId` to make all unique fields unique.** Emails, organization names, and any other unique-constrained fields must include the `testRunId` so parallel test runs don't collide.
- **Delete in reverse creation order.** Never assume ORM cascades work correctly - explicitly delete children before parents. If you created Organization -> User -> Project -> Test, delete Test -> Project -> User -> Organization.
- **The fingerprint must be deterministic.** The descriptor string should contain entity types, counts, and field structures - never timestamps, random values, or database IDs. The same scenario definition must always produce the same fingerprint.
- **If circular foreign keys exist, use the transaction + constraint drop pattern.** Wrap the deletion in a transaction, temporarily disable the circular constraint, delete in order, re-enable the constraint. The Environment Factory Guide documents this pattern.
- **Match existing codebase patterns.** Don't introduce new patterns, libraries, or conventions. If the app uses Prisma, use Prisma. If it uses a repository pattern, create a repository. If error handling uses a specific pattern, follow it.
- **The `standard` scenario is the most important.** It's used by 80%+ of tests. Make sure every entity is created with the exact values from `scenarios.md` - names, counts, statuses, relationships. A mismatch means dozens of test failures.
- **Test the full lifecycle, not just individual actions.** The most common bugs are in the seams: `up` creates data but `down` misses some entities, leaving orphans. The integration tests must verify the database is completely clean after `down`.
- **If context compaction occurs, re-read this prompt and use a TODO list.** After compaction, immediately re-read any relevant documentation (this prompt, scenarios.md, the Environment Factory Guide). Create or update a TODO list tracking what phases have been completed and what remains. This prevents losing track of progress.

</details>
