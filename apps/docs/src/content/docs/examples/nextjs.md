---
title: "Next.js Implementation"
description: "Complete working example of the Autonoma Environment Factory with Next.js + Prisma + PostgreSQL."
---

:::note[Prerequisites]
Read the [Environment Factory Guide](/guides/environment-factory/) first for concepts. This doc is the code.

**Stack:** Next.js 16 (App Router), Prisma ORM, PostgreSQL, JWT-based bypass auth, Vitest for integration tests.
:::

## File Structure

Each file has one clear responsibility:

```
src/
├── app/api/autonoma/
│   └── route.ts                    ← The POST endpoint (action routing, auth, security)
│
└── lib/private/autonoma/
    ├── types.ts                    ← Zod schemas for request validation + response types
    ├── ScenarioBuilder.ts          ← Abstract base class (fingerprinting, metadata)
    ├── RefsTokenFactory.ts         ← Signs and verifies refs with JWT
    ├── ScenarioRegistry.ts         ← Imports and registers all scenarios
    ├── teardownOrganization.ts     ← Shared teardown: deletes all org data in FK order
    │
    └── scenarios/
        ├── EmptyScenario.ts        ← Minimal scenario: org + user only
        └── StandardScenario.ts     ← Full scenario: apps, tests, runs, tags, etc.

test/integration/
└── autonoma-scenario.test.ts      ← Integration tests for the full lifecycle
```

## Step 1: Define the Types

This file defines the request/response contract. We use Zod to validate incoming requests as a discriminated union on `action`.

**File: `src/lib/private/autonoma/types.ts`**

```typescript
import { z } from "zod"

export const DiscoverBodySchema = z.object({ action: z.literal("discover") })

export const UpBodySchema = z.object({
    action: z.literal("up"),
    environment: z.string(),
    testRunId: z.string(),
})

export const DownBodySchema = z.object({
    action: z.literal("down"),
    testRunId: z.string(),
    refs: z.record(z.string(), z.unknown()),
    refsToken: z.string(),
})

export const AutonomaBodySchema = z.discriminatedUnion("action", [
    DiscoverBodySchema,
    UpBodySchema,
    DownBodySchema,
])

export type AutonomaBody = z.infer<typeof AutonomaBodySchema>

export type ErrorCode =
    | "UNKNOWN_ACTION"
    | "UNKNOWN_ENVIRONMENT"
    | "UP_FAILED"
    | "DOWN_FAILED"
    | "INVALID_REFS_TOKEN"

export type ScenarioRefs = Record<string, unknown>

export type ScenarioUpResult = {
    organizationId: string
    userId: string
    userEmail: string
    refs: ScenarioRefs
}

export type UpResponse = {
    auth: {
        cookies: Array<{
            name: string
            value: string
            httpOnly: boolean
            sameSite: "lax"
            path: string
        }>
    }
    refs: ScenarioRefs
    refsToken: string
    metadata: Record<string, unknown>
}

export type DownResponse = {
    ok: boolean
}

export type DiscoverEnvironment = {
    name: string
    description: string
    fingerprint: string
}

export type DiscoverResponse = {
    environments: DiscoverEnvironment[]
}

export type ErrorResponse = {
    error: string
    code: ErrorCode
}
```

The discriminated union means `AutonomaBodySchema.parse(body)` returns a narrowed type. When you `switch (body.action)`, TypeScript knows exactly which fields exist on each branch.

## Step 2: Build the Scenario Base Class

Every scenario extends this abstract class. It provides a contract (`up`/`down`) and automatic fingerprinting.

**File: `src/lib/private/autonoma/ScenarioBuilder.ts`**

```typescript
import crypto from "crypto"
import type { ScenarioRefs, ScenarioUpResult } from "./types"

export abstract class ScenarioBuilder {
    abstract readonly name: string
    abstract readonly description: string

    protected abstract readonly descriptor: Record<string, unknown>

    abstract up(testRunId: string): Promise<ScenarioUpResult>
    abstract down(refs: ScenarioRefs): Promise<void>

    fingerprint(): string {
        const json = JSON.stringify(this.descriptor)
        const hash = crypto.createHash("sha256").update(json).digest("hex")
        return hash.substring(0, 16)
    }

    meta() {
        return {
            name: this.name,
            description: this.description,
            fingerprint: this.fingerprint(),
        }
    }
}
```

Each scenario defines a `descriptor` — a plain object that mirrors the shape of the data it creates. SHA-256 hash of `JSON.stringify(descriptor)`, truncated to 16 hex chars.

## Step 3: Build the Refs Token Factory

This module handles JWT signing/verification for refs. Three functions, no state.

**File: `src/lib/private/autonoma/RefsTokenFactory.ts`**

```typescript
import { sign, verify, TokenExpiredError } from "jsonwebtoken"
import type { ScenarioRefs } from "./types"

const JWT_ALGORITHM = "HS256" as const
const REFS_TOKEN_EXPIRY = "24h"

function getSecret(): string {
    const secret = process.env.AUTONOMA_JWT_SECRET
    if (secret == null) throw new Error("AUTONOMA_JWT_SECRET is not configured")
    return secret
}

export function signRefs(refs: ScenarioRefs): string {
    return sign({ refs }, getSecret(), {
        algorithm: JWT_ALGORITHM,
        expiresIn: REFS_TOKEN_EXPIRY,
    })
}

export function verifyRefs(
    token: string,
): { refs: ScenarioRefs } | { error: string } {
    try {
        const decoded = verify(token, getSecret(), {
            algorithms: [JWT_ALGORITHM],
        }) as { refs: ScenarioRefs }
        return { refs: decoded.refs }
    } catch (error) {
        if (error instanceof TokenExpiredError) {
            return { error: "Refs token expired (older than 24h)" }
        }
        return { error: "Invalid refs token" }
    }
}

export function refsMatch(
    tokenRefs: ScenarioRefs,
    requestRefs: ScenarioRefs,
): boolean {
    return JSON.stringify(tokenRefs) === JSON.stringify(requestRefs)
}
```

## Step 4: Write Your First Scenario (Empty)

The simplest scenario — creates an org, a user, and nothing else. Used for testing empty states, onboarding flows, and first-time user experiences.

**File: `src/lib/private/autonoma/scenarios/EmptyScenario.ts`**

```typescript
import { db } from "@repo/database"
import { ScenarioBuilder } from "../ScenarioBuilder"
import { teardownOrganization } from "../teardownOrganization"
import type { ScenarioRefs, ScenarioUpResult } from "../types"

export class EmptyScenario extends ScenarioBuilder {
    readonly name = "empty"
    readonly description =
        "An organization with no data. Used for testing empty states, " +
        "first-time user experience, and onboarding flows."

    protected readonly descriptor = {
        org: { hasQuota: true },
        users: 1,
        applications: 0,
        tests: 0,
        folders: 1,
        tags: 0,
        runs: 0,
    }

    async up(testRunId: string): Promise<ScenarioUpResult> {
        // 1. Create the organization
        const org = await db.organization.create({
            data: {
                name: `Autonoma QA Empty [${testRunId}]`,
                orgConfiguration: {
                    regenOn: true,
                    smartClick: true,
                    architecture: { web: true, android: false, ios: false },
                },
            },
        })

        // 2. Create the quota
        await db.organizationQuota.create({
            data: {
                organizationId: org.id,
                active: true,
                unlimited: true,
                runsLeft: 0,
                purchasedRuns: 0,
            },
        })

        // 3. Create the root folder
        const rootFolder = await db.folder.create({
            data: {
                name: "Root",
                organizationID: org.id,
            },
        })

        // 4. Create the test user
        const user = await db.user.create({
            data: {
                name: "QA Empty",
                lastName: "Admin",
                email: `qa-empty-${testRunId}@autonoma.dev`,
                organizationID: org.id,
                isOnboarded: true,
            },
        })

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

Notice:
- The `testRunId` is baked into the org name and user email for uniqueness.
- The `refs` contain exactly the IDs of what was created.
- The `down` function delegates to `teardownOrganization` — a shared function that handles FK-order deletion.

## Step 5: Write the Full Scenario (Standard)

The standard scenario creates a representative dataset: 3 applications, 12 tests, 58 runs, folders, tags, components, variables, and more.

**The key pattern:** All data is defined as module-level constants. The `up` function iterates these constants to create records. The `descriptor` summarizes the same constants. They can't drift from each other.

**File: `src/lib/private/autonoma/scenarios/StandardScenario.ts`**

The data constants define the scenario (truncated for brevity — see the full source for all constants):

```typescript
const APPLICATIONS = [
    { name: "My Web App", type: "web" as const, versions: ["v1.0", "v1.1", "v2.0"] },
    { name: "Android Shopping", type: "android" as const, versions: ["v1.0", "v1.1"] },
    { name: "iOS Banking", type: "ios" as const, versions: ["v1.0"] },
] as const

const FOLDERS = [
    { name: "Smoke Tests", parentIdx: null },
    { name: "Regression", parentIdx: null },
    { name: "Deep Regression", parentIdx: 1 },   // subfolder of Regression
    { name: "Mobile Tests", parentIdx: null },
] as const

const TAGS = [
    { name: "critical", description: "Critical path tests", color: "#ef4444" },
    { name: "web", description: "Web application tests", color: "#3b82f6" },
    { name: "mobile", description: "Mobile application tests", color: "#22c55e" },
    { name: "ios", description: "iOS-specific tests", color: "#a855f7" },
] as const
```

The class itself — descriptor and `up`/`down` methods:

```typescript
export class StandardScenario extends ScenarioBuilder {
    readonly name = "standard"
    readonly description =
        "The default scenario for most tests. Contains 3 applications, " +
        "12 tests, 58 runs, 4 folders, 4 tags, 2 components, and more."

    protected readonly descriptor = {
        org: { hasQuota: true },
        users: 1,
        applications: APPLICATIONS.map((a) => ({
            type: a.type,
            versionCount: a.versions.length,
        })),
        folders: FOLDERS.length,
        tags: TAGS.map((t) => t.name),
        tests: {
            count: TESTS.length,
            byType: {
                final: TESTS.filter((t) => t.type === "final").length,
                draft: TESTS.filter((t) => t.type === "draft").length,
            },
        },
        runs: {
            count: RUNS.length,
            byStatus: countBy(RUNS, (r) => r.status),
            bySources: countBy(RUNS, (r) => r.source),
        },
        variables: VARIABLES.length,
        apiKeys: 1,
        schedules: 1,
        webhooks: 1,
        scripts: 1,
    }

    async up(testRunId: string): Promise<ScenarioUpResult> {
        const org = await createOrganization(testRunId)
        const user = await createUser(testRunId, org.id)
        const rootFolder = await createRootFolder(org.id, user.id)
        const folderIds = await createFolders(org.id, rootFolder.id)
        const { applicationIds, versionMap } = await createApplications(
            testRunId, org.id,
        )
        const tagIds = await createTags(org.id)
        // ... create tests, components, runs, variables, etc.

        return {
            organizationId: org.id,
            userId: user.id,
            userEmail: user.email,
            refs: {
                organizationId: org.id, userId: user.id,
                rootFolderId: rootFolder.id, folderIds,
                applicationIds, versionMap, tagIds,
                // ... all other IDs
            },
        }
    }

    async down(refs: ScenarioRefs): Promise<void> {
        await teardownOrganization(refs.organizationId as string)
    }
}
```

The descriptor reads from the same constants that `up` iterates. When you add a test, `TESTS.length` changes, the descriptor changes, the fingerprint changes, and Autonoma knows to re-analyze.

**Handling circular foreign keys:**

```typescript
async function createComponents(organizationId, userId, applicationIds, folderIds, versionMap) {
    for (const comp of COMPONENTS) {
        const componentId = createId()
        const versionId = createId()

        await db.$transaction(async (tx) => {
            await tx.$executeRaw`ALTER TABLE "component" DISABLE TRIGGER ALL`
            await tx.$executeRaw`ALTER TABLE "component_version" DISABLE TRIGGER ALL`

            await tx.component.create({
                data: {
                    id: componentId,
                    name: comp.name,
                    defaultVersionId: versionId,
                    // ...
                },
            })

            await tx.componentVersion.create({
                data: {
                    id: versionId,
                    componentId,
                    // ...
                },
            })

            await tx.$executeRaw`ALTER TABLE "component" ENABLE TRIGGER ALL`
            await tx.$executeRaw`ALTER TABLE "component_version" ENABLE TRIGGER ALL`
        })
    }
}
```

## Step 6: Write the Teardown Function

Deletes **all** records for an organization in reverse FK order. Both scenarios share it.

**File: `src/lib/private/autonoma/teardownOrganization.ts`**

```typescript
import { db } from "@repo/database"

export async function teardownOrganization(organizationId: string): Promise<void> {
    // 1. Webhook notification rules
    await db.webhookNotificationRule.deleteMany({
        where: { webhook: { organizationID: organizationId } },
    })

    // 2. Webhooks
    await db.webhook.deleteMany({ where: { organizationID: organizationId } })

    // 3. Run schedules
    await db.runSchedule.deleteMany({
        where: {
            OR: [
                { folder: { organizationID: organizationId } },
                { testGroup: { organizationID: organizationId } },
                { tag: { organizationID: organizationId } },
            ],
        },
    })

    // 4. Run metadata
    await db.runMetadata.deleteMany({
        where: { run: { organizationID: organizationId } },
    })

    // 5-6. Steps, then Runs
    await db.step.deleteMany({
        where: { run: { organizationID: organizationId } },
    })
    await db.run.deleteMany({ where: { organizationID: organizationId } })

    // 7. Run groups (orphaned)
    await db.runGroup.deleteMany({ where: { runs: { none: {} } } })

    // 8-10. Tag assignments, component assignments, test steps
    await db.tagInTestGroup.deleteMany({ where: { organizationID: organizationId } })
    await db.componentVersionAssignment.deleteMany({
        where: { component: { organizationId } },
    })
    await db.testStep.deleteMany({
        where: { stepSequence: { organizationId } },
    })

    // 11. Components + ComponentVersions (CIRCULAR FK — drop constraint)
    await db.$transaction([
        db.$executeRaw`ALTER TABLE "component" DROP CONSTRAINT IF EXISTS "component_default_version_id_fkey"`,
        db.$executeRaw`DELETE FROM "component_version" WHERE "organization_id" = ${organizationId}`,
        db.$executeRaw`DELETE FROM "component" WHERE "organization_id" = ${organizationId}`,
        db.$executeRaw`ALTER TABLE "component" ADD CONSTRAINT "component_default_version_id_fkey" FOREIGN KEY ("default_version_id") REFERENCES "component_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    ])

    // 12-20. Step sequences, tests, test groups, tags, app versions, apps, variables, scripts, API keys
    await db.stepSequence.deleteMany({ where: { organizationId } })
    await db.test.deleteMany({ where: { organizationID: organizationId } })
    await db.testGroup.deleteMany({ where: { organizationID: organizationId } })
    await db.tag.deleteMany({ where: { organizationID: organizationId } })
    await db.applicationVersion.deleteMany({ where: { organizationID: organizationId } })
    await db.application.deleteMany({ where: { organizationId } })
    await db.variable.deleteMany({ where: { organizationID: organizationId } })
    await db.script.deleteMany({ where: { organizationID: organizationId } })
    await db.apiKey.deleteMany({ where: { organizationId } })

    // 21. Folders — children first
    await db.folder.deleteMany({
        where: { organizationID: organizationId, parentID: { not: null } },
    })
    await db.folder.deleteMany({ where: { organizationID: organizationId } })

    // 22-24. Users, quota, organization
    await db.user.deleteMany({ where: { organizationID: organizationId } })
    await db.organizationQuota.deleteMany({ where: { organizationId } })
    await db.organization.delete({ where: { id: organizationId } })
}
```

## Step 7: Register Scenarios

**File: `src/lib/private/autonoma/ScenarioRegistry.ts`**

```typescript
import type { ScenarioBuilder } from "./ScenarioBuilder"
import { EmptyScenario } from "./scenarios/EmptyScenario"
import { StandardScenario } from "./scenarios/StandardScenario"

const scenarios: ScenarioBuilder[] = [
    new StandardScenario(),
    new EmptyScenario(),
]

export function findScenario(name: string): ScenarioBuilder | undefined {
    return scenarios.find((s) => s.name === name)
}

export function getAllScenarios(): ScenarioBuilder[] {
    return scenarios
}
```

## Step 8: Build the Route Handler

The endpoint Autonoma calls. Handles security, parsing, action routing, and auth cookie generation.

**File: `src/app/api/autonoma/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { sign } from "jsonwebtoken"
import crypto from "crypto"
import { AutonomaBodySchema, type ErrorCode } from "@/lib/private/autonoma/types"
import { findScenario, getAllScenarios } from "@/lib/private/autonoma/ScenarioRegistry"
import { signRefs, verifyRefs, refsMatch } from "@/lib/private/autonoma/RefsTokenFactory"

const JWT_ALGORITHM = "HS256" as const

export async function POST(request: NextRequest) {
    // Layer 1: Environment gating
    if (
        process.env.NODE_ENV === "production" &&
        process.env.AUTONOMA_FACTORY_ENABLED !== "true"
    ) {
        return new NextResponse(null, { status: 404 })
    }

    // Layer 2: HMAC signature verification (uses AUTONOMA_SIGNING_SECRET)
    const rawBody = await request.text()
    const signature = request.headers.get("x-signature")

    if (signature == null) {
        return errorResponse("Missing signature", "UNKNOWN_ACTION", 401)
    }
    if (!verifySignature(rawBody, signature)) {
        return errorResponse("Invalid signature", "UNKNOWN_ACTION", 401)
    }

    // Parse and validate
    let body
    try {
        body = AutonomaBodySchema.parse(JSON.parse(rawBody))
    } catch {
        return errorResponse("Invalid request body", "UNKNOWN_ACTION", 400)
    }

    // Route to action handler
    switch (body.action) {
        case "discover":
            return handleDiscover()
        case "up":
            return handleUp(body.environment, body.testRunId)
        case "down":
            return handleDown(body.refs, body.refsToken)
    }
}

function handleDiscover() {
    const environments = getAllScenarios().map((s) => s.meta())
    return NextResponse.json({ environments })
}

async function handleUp(environment: string, testRunId: string) {
    const scenario = findScenario(environment)
    if (scenario == null) {
        return errorResponse(
            `Unknown environment: ${environment}`,
            "UNKNOWN_ENVIRONMENT",
            400,
        )
    }

    try {
        const result = await scenario.up(testRunId)
        const refsToken = signRefs(result.refs)
        const cookies = createBypassCookies(
            result.userEmail,
            result.organizationId,
        )

        return NextResponse.json({
            auth: { cookies },
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

async function handleDown(
    refs: Record<string, unknown>,
    refsToken: string,
) {
    // Layer 3: Verify signed refs
    const verification = verifyRefs(refsToken)
    if ("error" in verification) {
        return errorResponse(verification.error, "INVALID_REFS_TOKEN", 403)
    }

    if (!refsMatch(verification.refs, refs)) {
        return errorResponse("Refs do not match token", "INVALID_REFS_TOKEN", 403)
    }

    const scenarioName = findScenarioForRefs(refs)
    const scenario = scenarioName != null ? findScenario(scenarioName) : null

    if (scenario == null) {
        return errorResponse(
            "Could not determine scenario for refs",
            "DOWN_FAILED",
            400,
        )
    }

    try {
        await scenario.down(refs)
        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error("[Autonoma] down failed", { error })
        return errorResponse("Teardown failed", "DOWN_FAILED", 500)
    }
}

function verifySignature(rawBody: string, signature: string): boolean {
    const secret = process.env.AUTONOMA_SIGNING_SECRET
    if (secret == null) return false
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex")
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}

function errorResponse(message: string, code: ErrorCode, status: number) {
    return NextResponse.json({ error: message, code }, { status })
}

function createBypassCookies(email: string, organizationId: string) {
    const secret = process.env.AUTONOMA_JWT_SECRET
    if (secret == null) throw new Error("AUTONOMA_JWT_SECRET is not configured")

    const accessToken = sign(
        { email, externalOrganizationId: organizationId },
        secret,
        { algorithm: JWT_ALGORITHM, expiresIn: "1h" },
    )

    const refreshToken = sign(
        { email, externalOrganizationId: organizationId, type: "refresh" },
        secret,
        { algorithm: JWT_ALGORITHM, expiresIn: "7d" },
    )

    return [
        {
            name: "autonoma-bypass-token",
            value: accessToken,
            httpOnly: true,
            sameSite: "lax" as const,
            path: "/",
        },
        {
            name: "autonoma-bypass-refresh-token",
            value: refreshToken,
            httpOnly: true,
            sameSite: "lax" as const,
            path: "/",
        },
    ]
}

function findScenarioForRefs(
    refs: Record<string, unknown>,
): string | null {
    if (refs.organizationId == null) return null

    const allScenarios = getAllScenarios()
    for (const scenario of allScenarios) {
        if (canHandleRefs(scenario.name, refs)) return scenario.name
    }

    return allScenarios[0]?.name ?? null
}

function canHandleRefs(
    scenarioName: string,
    refs: Record<string, unknown>,
): boolean {
    if (scenarioName === "empty") {
        return refs.applicationIds == null && refs.testIds == null
    }
    if (scenarioName === "standard") {
        return refs.applicationIds != null
    }
    return false
}
```

## Step 9: Write Integration Tests

The tests verify the full lifecycle end-to-end against a real database.

**File: `test/integration/autonoma-scenario.test.ts`**

```typescript
import { beforeAll, afterEach, describe, expect, it } from "vitest"
import { POST } from "@/app/api/autonoma/route"
import { NextRequest } from "next/server"
import { db } from "@repo/database"
import crypto from "crypto"
import { sign } from "jsonwebtoken"

const SHARED_SECRET = "test-shared-secret"
const INTERNAL_SECRET = "test-internal-secret"

function signBody(body: string): string {
    return crypto
        .createHmac("sha256", SHARED_SECRET)
        .update(body)
        .digest("hex")
}

function createRequest(body: object): NextRequest {
    const bodyStr = JSON.stringify(body)
    const signature = signBody(bodyStr)

    return new NextRequest("http://localhost:3000/api/autonoma", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-signature": signature,
        },
        body: bodyStr,
    })
}

beforeAll(() => {
    process.env.AUTONOMA_SIGNING_SECRET = SHARED_SECRET
    process.env.AUTONOMA_JWT_SECRET = INTERNAL_SECRET
})

describe("POST /api/autonoma", () => {
    describe("discover", () => {
        it("returns all available scenarios with fingerprints", async () => {
            const request = createRequest({ action: "discover" })
            const response = await POST(request)

            expect(response.status).toBe(200)
            const data = await response.json()

            expect(data.environments).toHaveLength(2)

            const standard = data.environments.find(
                (e: any) => e.name === "standard",
            )
            expect(standard).toBeDefined()
            expect(standard.fingerprint).toHaveLength(16)

            const empty = data.environments.find(
                (e: any) => e.name === "empty",
            )
            expect(empty).toBeDefined()
            expect(empty.fingerprint).toHaveLength(16)
        })

        it("returns stable fingerprints across calls", async () => {
            const response1 = await POST(
                createRequest({ action: "discover" }),
            )
            const data1 = await response1.json()

            const response2 = await POST(
                createRequest({ action: "discover" }),
            )
            const data2 = await response2.json()

            expect(data1.environments[0].fingerprint).toBe(
                data2.environments[0].fingerprint,
            )
        })
    })

    describe("up + down — empty scenario", () => {
        it("creates org and user, then tears down cleanly", async () => {
            const upResponse = await POST(
                createRequest({
                    action: "up",
                    environment: "empty",
                    testRunId: "test-empty-001",
                }),
            )
            expect(upResponse.status).toBe(200)
            const upData = await upResponse.json()

            // Verify response shape
            expect(upData.refs.organizationId).toBeDefined()
            expect(upData.refs.userId).toBeDefined()
            expect(upData.refsToken).toBeDefined()
            expect(upData.auth.cookies).toHaveLength(2)

            // Verify data exists
            const org = await db.organization.findUnique({
                where: { id: upData.refs.organizationId },
            })
            expect(org).not.toBeNull()

            // Tear down
            const downResponse = await POST(
                createRequest({
                    action: "down",
                    testRunId: "test-empty-001",
                    refs: upData.refs,
                    refsToken: upData.refsToken,
                }),
            )
            expect(downResponse.status).toBe(200)
            expect((await downResponse.json()).ok).toBe(true)

            // Verify cleanup
            const orgAfter = await db.organization.findUnique({
                where: { id: upData.refs.organizationId },
            })
            expect(orgAfter).toBeNull()
        })
    })

    describe("down security", () => {
        it("rejects tampered refs token", async () => {
            const response = await POST(
                createRequest({
                    action: "down",
                    testRunId: "test-tampered",
                    refs: { organizationId: "some-production-id" },
                    refsToken: "tampered.token.value",
                }),
            )
            expect(response.status).toBe(403)
            expect((await response.json()).code).toBe("INVALID_REFS_TOKEN")
        })

        it("rejects expired refs token", async () => {
            const expiredToken = sign(
                { refs: { organizationId: "test" } },
                INTERNAL_SECRET,
                { algorithm: "HS256", expiresIn: "-1h" },
            )

            const response = await POST(
                createRequest({
                    action: "down",
                    testRunId: "test-expired",
                    refs: { organizationId: "test" },
                    refsToken: expiredToken,
                }),
            )
            expect(response.status).toBe(403)
        })
    })

    describe("signature verification", () => {
        it("rejects request without signature", async () => {
            const body = JSON.stringify({ action: "discover" })
            const request = new NextRequest(
                "http://localhost:3000/api/autonoma",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body,
                },
            )
            const response = await POST(request)
            expect(response.status).toBe(401)
        })
    })

    describe("error handling", () => {
        it("returns 400 for unknown environment", async () => {
            const response = await POST(
                createRequest({
                    action: "up",
                    environment: "nonexistent",
                    testRunId: "test-bad",
                }),
            )
            expect(response.status).toBe(400)
            expect((await response.json()).code).toBe("UNKNOWN_ENVIRONMENT")
        })
    })
})
```

## Data Reference Tables

Quick reference for the standard scenario's data.

### Applications (3)

| Name              | Platform | Versions            |
| ----------------- | -------- | ------------------- |
| My Web App        | Web      | v1.0, v1.1, v2.0   |
| Android Shopping  | Android  | v1.0, v1.1          |
| iOS Banking       | iOS      | v1.0                |

### Tests (12)

| Name                | App                      | Status    | Folder       | Tags             |
| ------------------- | ------------------------ | --------- | ------------ | ---------------- |
| Login Flow          | My Web App v1.0          | Published | Smoke Tests  | critical, web    |
| Checkout Flow       | My Web App v1.1          | Published | Regression   | web              |
| Search Products     | My Web App v2.0          | Published | Smoke Tests  | web              |
| User Profile Update | My Web App v1.0          | Published | Regression   | web              |
| Add to Cart         | My Web App v1.1          | Published | Regression   | critical, web    |
| Mobile Login        | Android Shopping v1.0    | Published | Smoke Tests  | critical, mobile |
| Browse Categories   | Android Shopping v1.1    | Published | Mobile Tests | mobile           |
| iOS Onboarding      | iOS Banking v1.0         | Published | Mobile Tests | mobile, ios      |
| Password Reset      | My Web App v1.0          | Published | *(none)*     | web              |
| Signup Flow         | My Web App v2.0          | Published | *(none)*     | web              |
| Draft Test Alpha    | My Web App v1.0          | Draft     | *(none)*     | *(none)*         |
| Draft Test Beta     | Android Shopping v1.0    | Draft     | *(none)*     | *(none)*         |

### Runs (58)

- **Statuses:** ~29 passed, ~15 failed, ~5 running, ~5 pending, ~4 stopped
- **Sources:** ~35 manual, ~12 scheduled, ~6 API, ~3 CI-CD, ~2 Vercel
- **Date range:** Spread over 60 days

### Other Entities

| Entity     | Count    | Details                                                            |
| ---------- | -------- | ------------------------------------------------------------------ |
| Folders    | 4 (+root)| Smoke Tests, Regression, Deep Regression (sub), Mobile Tests       |
| Tags       | 4        | critical, web, mobile, ios                                         |
| Components | 2        | Login Component (3 steps), Navigation Component (2 steps)          |
| Variables  | 3        | BASE_URL, TEST_EMAIL, TEST_PASSWORD                                |
| API Keys   | 1        | Hashed with bcrypt                                                 |
| Schedules  | 1        | Daily at 2:00 AM, runs Smoke Tests folder                         |
| Webhooks   | 1        | Slack notifications on failure                                     |
| Scripts    | 1        | Pre-run curl script                                                |
