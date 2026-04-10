---
title: "React + Vite Implementation"
description: "Autonoma Environment Factory with React + Vite + Express backend + Prisma + PostgreSQL."
---

:::note[Prerequisites]
Read the [Environment Factory Guide](/guides/environment-factory/) first for concepts. This doc is the code.

**Stack:** React 19 + Vite (frontend), Express.js (backend API), Prisma ORM, PostgreSQL, JWT-based bypass auth, Vitest for integration tests.
:::

## Architecture Overview

Unlike Next.js (which has built-in API routes), a React + Vite app is a static SPA. You need a **separate backend** to host the Autonoma endpoint. This example uses Express.js, but the pattern works with any Node.js server (Fastify, Hono, Koa, etc.).

```
project/
├── client/                         ← React + Vite SPA
│   ├── src/
│   └── vite.config.ts
├── server/                         ← Express.js backend
│   ├── src/
│   │   ├── index.ts               ← Express app entry
│   │   ├── routes/
│   │   │   └── autonoma.ts        ← The POST endpoint
│   │   └── lib/autonoma/
│   │       ├── types.ts
│   │       ├── ScenarioBuilder.ts
│   │       ├── RefsTokenFactory.ts
│   │       ├── ScenarioRegistry.ts
│   │       ├── teardown.ts
│   │       └── scenarios/
│   │           ├── EmptyScenario.ts
│   │           └── StandardScenario.ts
│   └── test/
│       └── autonoma.test.ts
├── prisma/
│   └── schema.prisma
└── package.json
```

## Step 1: Express Route Handler

The endpoint is an Express route instead of a Next.js API route. The core logic is identical — only the HTTP layer differs.

**File: `server/src/routes/autonoma.ts`**

```typescript
import { Router, type Request, type Response } from "express"
import { AutonomaBodySchema, type ErrorCode } from "../lib/autonoma/types"
import { findScenario, getAllScenarios } from "../lib/autonoma/ScenarioRegistry"
import { signRefs, verifyRefs, refsMatch } from "../lib/autonoma/RefsTokenFactory"
import { verifySignature } from "../lib/autonoma/signature"
import { createBypassToken } from "../lib/autonoma/auth"

const router = Router()

router.post("/api/autonoma", async (req: Request, res: Response) => {
    // Layer 1: Environment gating
    if (
        process.env.NODE_ENV === "production" &&
        process.env.AUTONOMA_FACTORY_ENABLED !== "true"
    ) {
        return res.status(404).end()
    }

    // Layer 2: HMAC signature verification
    const rawBody = req.body
    const signature = req.headers["x-signature"] as string | undefined

    if (signature == null) {
        return res.status(401).json({ error: "Missing signature" })
    }
    if (!verifySignature(rawBody, signature)) {
        return res.status(401).json({ error: "Invalid signature" })
    }

    // Parse and validate
    const parsed = AutonomaBodySchema.safeParse(JSON.parse(rawBody))
    if (!parsed.success) {
        return errorResponse(res, "Invalid request body", "UNKNOWN_ACTION", 400)
    }

    const body = parsed.data

    switch (body.action) {
        case "discover":
            return handleDiscover(res)
        case "up":
            return handleUp(res, body.environment, body.testRunId)
        case "down":
            return handleDown(res, body.refs, body.refsToken)
    }
})

function handleDiscover(res: Response) {
    const environments = getAllScenarios().map((s) => s.meta())
    return res.json({ environments })
}

async function handleUp(res: Response, environment: string, testRunId: string) {
    const scenario = findScenario(environment)
    if (scenario == null) {
        return errorResponse(res, `Unknown environment: ${environment}`, "UNKNOWN_ENVIRONMENT", 400)
    }

    try {
        const result = await scenario.up(testRunId)
        const refsToken = signRefs(result.refs)

        const accessToken = createBypassToken(result.userEmail, result.organizationId)

        return res.json({
            auth: {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
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
        return errorResponse(res, "Failed to create environment", "UP_FAILED", 500)
    }
}

async function handleDown(
    res: Response,
    refs: Record<string, unknown>,
    refsToken: string,
) {
    const verification = verifyRefs(refsToken)
    if ("error" in verification) {
        return errorResponse(res, verification.error, "INVALID_REFS_TOKEN", 403)
    }

    if (!refsMatch(verification.refs, refs)) {
        return errorResponse(res, "Refs do not match token", "INVALID_REFS_TOKEN", 403)
    }

    const scenario = findScenario("standard") ?? findScenario("empty")
    if (scenario == null) {
        return errorResponse(res, "No scenario found", "DOWN_FAILED", 400)
    }

    try {
        await scenario.down(refs)
        return res.json({ ok: true })
    } catch (error) {
        console.error("[Autonoma] down failed", { error })
        return errorResponse(res, "Teardown failed", "DOWN_FAILED", 500)
    }
}

function errorResponse(res: Response, message: string, code: ErrorCode, status: number) {
    return res.status(status).json({ error: message, code })
}

export { router as autonomaRouter }
```

## Step 2: Raw Body Middleware

Express parses JSON by default, but HMAC verification needs the **raw** body. Add a middleware that preserves it.

**File: `server/src/index.ts`**

```typescript
import express from "express"
import { autonomaRouter } from "./routes/autonoma"

const app = express()

// Preserve raw body for signature verification on the autonoma route
app.use("/api/autonoma", express.raw({ type: "application/json" }))

// JSON parsing for all other routes
app.use(express.json())

app.use(autonomaRouter)

app.listen(4000, () => {
    console.log("Server running on port 4000")
})
```

## Step 3: Bearer Token Auth (instead of cookies)

Since your React SPA stores tokens in memory or localStorage (not httpOnly cookies), return a bearer token instead:

**File: `server/src/lib/autonoma/auth.ts`**

```typescript
import { sign } from "jsonwebtoken"

export function createBypassToken(email: string, organizationId: string): string {
    const secret = process.env.AUTONOMA_JWT_SECRET
    if (secret == null) throw new Error("AUTONOMA_JWT_SECRET is not configured")

    return sign(
        { email, organizationId, bypass: true },
        secret,
        { algorithm: "HS256", expiresIn: "1h" },
    )
}
```

The `auth` response uses `headers` instead of `cookies`:

```json
{
    "auth": {
        "headers": {
            "Authorization": "Bearer eyJ..."
        }
    }
}
```

Autonoma injects this header into every request during the test run.

## Step 4: Vite Proxy Configuration

During development, proxy the Autonoma endpoint from Vite's dev server to Express:

**File: `client/vite.config.ts`**

```typescript
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            "/api": {
                target: "http://localhost:4000",
                changeOrigin: true,
            },
        },
    },
})
```

## Key Differences from Next.js

| Aspect                | Next.js                                    | React + Vite + Express                           |
| --------------------- | ------------------------------------------ | ------------------------------------------------ |
| **Endpoint location** | `app/api/autonoma/route.ts`                | `server/src/routes/autonoma.ts`                  |
| **HTTP framework**    | Next.js `NextRequest` / `NextResponse`     | Express `req` / `res`                            |
| **Auth strategy**     | httpOnly cookies (session-based)           | Bearer token in `Authorization` header           |
| **Raw body access**   | `request.text()` (built-in)                | `express.raw()` middleware                       |
| **Dev server**        | Single `next dev`                          | Two processes: `vite dev` + `node server`        |
| **Deployment**        | Single Vercel/Docker deploy                | Separate static hosting + API server             |

## Shared Files

The following files are **identical** to the Next.js example:

- `types.ts` — Zod schemas and TypeScript types
- `ScenarioBuilder.ts` — Abstract base class with fingerprinting
- `RefsTokenFactory.ts` — JWT signing/verification for refs
- `ScenarioRegistry.ts` — Scenario registration
- `scenarios/EmptyScenario.ts` — Empty scenario
- `scenarios/StandardScenario.ts` — Standard scenario
- `teardown.ts` — Organization teardown in FK order

See the [Next.js Implementation](/examples/nextjs/) for the full source of these files.
