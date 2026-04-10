---
title: "TanStack Start Implementation"
description: "Autonoma Environment Factory with TanStack Start, Vinxi server functions, and Drizzle ORM + PostgreSQL."
---

:::note[Prerequisites]
Read the [Environment Factory Guide](/guides/environment-factory/) first for concepts. This doc is the code.

**Stack:** TanStack Start (full-stack React), Vinxi server functions, Drizzle ORM, PostgreSQL, JWT-based auth, Vitest for integration tests.
:::

## Architecture Overview

TanStack Start provides full-stack capabilities with server functions (via Vinxi). The Autonoma endpoint is a server-side API route — similar to Next.js but using TanStack's routing primitives.

```
app/
├── routes/
│   └── api/
│       └── autonoma.ts              ← The POST endpoint (API route)
├── lib/
│   └── autonoma/
│       ├── types.ts                 ← Zod schemas + TypeScript types
│       ├── scenario-builder.ts      ← Abstract base class
│       ├── refs-token.ts            ← JWT signing/verification
│       ├── signature.ts             ← HMAC-SHA256 verification
│       ├── scenario-registry.ts     ← Scenario registration
│       ├── teardown.ts              ← Shared teardown logic
│       └── scenarios/
│           ├── empty.ts             ← Minimal scenario
│           └── standard.ts          ← Full data scenario
├── db/
│   ├── schema.ts                    ← Drizzle schema definitions
│   └── index.ts                     ← Database connection
└── test/
    └── autonoma.test.ts
```

## Step 1: API Route Handler

TanStack Start uses file-based API routes. The handler receives a standard `Request` object and returns a `Response`.

**File: `app/routes/api/autonoma.ts`**

```typescript
import { json } from "@tanstack/react-start"
import { createAPIFileRoute } from "@tanstack/react-start/api"
import { AutonomaBodySchema, type ErrorCode } from "~/lib/autonoma/types"
import { findScenario, getAllScenarios } from "~/lib/autonoma/scenario-registry"
import { signRefs, verifyRefs, refsMatch } from "~/lib/autonoma/refs-token"
import { verifySignature } from "~/lib/autonoma/signature"
import { createBypassToken } from "~/lib/autonoma/auth"

export const APIRoute = createAPIFileRoute("/api/autonoma")({
    POST: async ({ request }) => {
        // Layer 1: Environment gating
        if (
            process.env.NODE_ENV === "production" &&
            process.env.AUTONOMA_FACTORY_ENABLED !== "true"
        ) {
            return new Response(null, { status: 404 })
        }

        // Layer 2: HMAC signature verification
        const rawBody = await request.text()
        const signature = request.headers.get("x-signature")

        if (signature == null) {
            return json({ error: "Missing signature" }, { status: 401 })
        }
        if (!verifySignature(rawBody, signature)) {
            return json({ error: "Invalid signature" }, { status: 401 })
        }

        // Parse and validate
        const parsed = AutonomaBodySchema.safeParse(JSON.parse(rawBody))
        if (!parsed.success) {
            return json({ error: "Invalid request body", code: "UNKNOWN_ACTION" }, { status: 400 })
        }

        const body = parsed.data

        switch (body.action) {
            case "discover":
                return handleDiscover()
            case "up":
                return handleUp(body.environment, body.testRunId)
            case "down":
                return handleDown(body.refs, body.refsToken)
        }
    },
})

function handleDiscover() {
    const environments = getAllScenarios().map((s) => s.meta())
    return json({ environments })
}

async function handleUp(environment: string, testRunId: string) {
    const scenario = findScenario(environment)
    if (scenario == null) {
        return errorResponse(`Unknown environment: ${environment}`, "UNKNOWN_ENVIRONMENT", 400)
    }

    try {
        const result = await scenario.up(testRunId)
        const refsToken = signRefs(result.refs)
        const accessToken = createBypassToken(result.userEmail, result.organizationId)

        return json({
            auth: {
                cookies: [
                    {
                        name: "autonoma-bypass-token",
                        value: accessToken,
                        httpOnly: true,
                        sameSite: "lax" as const,
                        path: "/",
                    },
                ],
            },
            refs: result.refs,
            refsToken,
            metadata: {
                organizationId: result.organizationId,
                email: result.userEmail,
                scenario: environment,
            },
        })
    } catch (error) {
        console.error("[Autonoma] up failed", { environment, testRunId, error })
        return errorResponse("Failed to create environment", "UP_FAILED", 500)
    }
}

async function handleDown(refs: Record<string, unknown>, refsToken: string) {
    const verification = verifyRefs(refsToken)
    if ("error" in verification) {
        return errorResponse(verification.error, "INVALID_REFS_TOKEN", 403)
    }

    if (!refsMatch(verification.refs, refs)) {
        return errorResponse("Refs do not match token", "INVALID_REFS_TOKEN", 403)
    }

    const scenario = findScenario("standard") ?? findScenario("empty")
    if (scenario == null) {
        return errorResponse("No scenario found", "DOWN_FAILED", 400)
    }

    try {
        await scenario.down(refs)
        return json({ ok: true })
    } catch (error) {
        console.error("[Autonoma] down failed", { error })
        return errorResponse("Teardown failed", "DOWN_FAILED", 500)
    }
}

function errorResponse(message: string, code: ErrorCode, status: number) {
    return json({ error: message, code }, { status })
}
```

## Step 2: Drizzle Schema & Teardown

TanStack Start commonly pairs with Drizzle ORM. Here's the teardown using Drizzle:

**File: `app/lib/autonoma/teardown.ts`**

```typescript
import { eq, and, isNotNull } from "drizzle-orm"
import { db } from "~/db"
import {
    runs, steps, tests, tags, applications, applicationVersions,
    folders, users, organizations, organizationQuotas,
} from "~/db/schema"

export async function teardownOrganization(organizationId: string): Promise<void> {
    // Delete in reverse FK order
    await db.delete(steps).where(
        eq(steps.organizationId, organizationId),
    )
    await db.delete(runs).where(
        eq(runs.organizationId, organizationId),
    )
    await db.delete(tests).where(
        eq(tests.organizationId, organizationId),
    )
    await db.delete(tags).where(
        eq(tags.organizationId, organizationId),
    )
    await db.delete(applicationVersions).where(
        eq(applicationVersions.organizationId, organizationId),
    )
    await db.delete(applications).where(
        eq(applications.organizationId, organizationId),
    )

    // Folders — children first
    await db.delete(folders).where(
        and(
            eq(folders.organizationId, organizationId),
            isNotNull(folders.parentId),
        ),
    )
    await db.delete(folders).where(
        eq(folders.organizationId, organizationId),
    )

    // Users, quota, organization
    await db.delete(users).where(
        eq(users.organizationId, organizationId),
    )
    await db.delete(organizationQuotas).where(
        eq(organizationQuotas.organizationId, organizationId),
    )
    await db.delete(organizations).where(
        eq(organizations.id, organizationId),
    )
}
```

## Step 3: Empty Scenario with Drizzle

**File: `app/lib/autonoma/scenarios/empty.ts`**

```typescript
import { db } from "~/db"
import { organizations, users, folders } from "~/db/schema"
import { ScenarioBuilder } from "../scenario-builder"
import { teardownOrganization } from "../teardown"
import type { ScenarioRefs, ScenarioUpResult } from "../types"

export class EmptyScenario extends ScenarioBuilder {
    readonly name = "empty"
    readonly description =
        "An organization with no data. Used for testing empty states and onboarding flows."

    protected readonly descriptor = {
        org: { hasQuota: true },
        users: 1,
        applications: 0,
        tests: 0,
    }

    async up(testRunId: string): Promise<ScenarioUpResult> {
        const [org] = await db.insert(organizations).values({
            name: `Autonoma QA Empty [${testRunId}]`,
        }).returning()

        const [user] = await db.insert(users).values({
            name: "QA Empty",
            email: `qa-empty-${testRunId}@autonoma.dev`,
            organizationId: org.id,
        }).returning()

        const [rootFolder] = await db.insert(folders).values({
            name: "Root",
            organizationId: org.id,
        }).returning()

        return {
            organizationId: org.id,
            userId: user.id,
            userEmail: user.email,
            refs: {
                organizationId: org.id,
                userId: user.id,
                folderId: rootFolder.id,
            },
        }
    }

    async down(refs: ScenarioRefs): Promise<void> {
        await teardownOrganization(refs.organizationId as string)
    }
}
```

## Key Differences from Next.js

| Aspect                  | Next.js                           | TanStack Start                               |
| ----------------------- | --------------------------------- | -------------------------------------------- |
| **API route definition**| `export async function POST()`    | `createAPIFileRoute().POST()`                |
| **Response helper**     | `NextResponse.json()`             | `json()` from `@tanstack/react-start`        |
| **Request object**      | `NextRequest`                     | Standard `Request` (Web API)                 |
| **ORM**                 | Prisma                            | Drizzle (SQL-like, lighter)                  |
| **Insert syntax**       | `db.user.create({ data })`       | `db.insert(users).values(data).returning()`  |
| **Delete syntax**       | `db.user.deleteMany({ where })`  | `db.delete(users).where(eq(...))`            |
| **File routing**        | `app/api/autonoma/route.ts`       | `app/routes/api/autonoma.ts`                 |
| **Build tool**          | Next.js + Webpack/Turbopack       | Vinxi + Vite                                 |

## Shared Files

These files are **identical** to the Next.js example (only the ORM calls differ):

- `types.ts` — Zod schemas and TypeScript types
- `scenario-builder.ts` — Abstract base class with fingerprinting
- `refs-token.ts` — JWT signing/verification for refs
- `signature.ts` — HMAC-SHA256 verification
- `scenario-registry.ts` — Scenario registration

See the [Next.js Implementation](/examples/nextjs/) for the full source of these shared files.
