---
title: Environment Factory Guide
description: How to implement the Autonoma Environment Factory in your application — a single POST endpoint for creating and destroying isolated test environments.
---

:::note
This guide teaches you how to implement the Autonoma Environment Factory in your application, regardless of language or framework. For a complete working example in Next.js + Prisma, see the [Next.js Implementation](/examples/nextjs/).
:::

## The Big Picture

Before Autonoma runs an E2E test, it needs two things:

1. **Data** — a user account, some test records, whatever the test scenario requires
2. **Authentication** — a way to log in as that user (cookies, headers, or credentials)

After the test finishes, everything gets cleaned up so the next test starts fresh.

Your job is to implement **one endpoint** that handles three actions:

| Action       | When it's called               | What you do                                                              |
| ------------ | ------------------------------ | ------------------------------------------------------------------------ |
| **discover** | When Autonoma connects         | Return a list of available scenarios (e.g., "empty", "standard", "large") |
| **up**       | Before each test run           | Create data, generate auth credentials, return everything                |
| **down**     | After each test run            | Verify the request is legitimate, then delete the data you created       |

That's it. One endpoint, three actions, and Autonoma handles the rest.

### Why "scenarios"?

Different tests need different data. A test for "empty state messaging" needs an org with zero data. A test for "pagination in the runs table" needs hundreds of runs. Instead of one giant seed, you define named **scenarios** — each one creates exactly the data its tests need.

## How the Protocol Works

All communication is a single **POST** request with a JSON body. The `action` field tells your endpoint what to do.

### Discover

Autonoma asks: "What scenarios do you support?"

**Request fields:**

| Field    | Type          | Description                    |
| -------- | ------------- | ------------------------------ |
| `action` | `"discover"`  | Always the string `"discover"` |

**Response fields:**

| Field                          | Type   | Description                                                        |
| ------------------------------ | ------ | ------------------------------------------------------------------ |
| `environments`                 | array  | List of available scenarios                                        |
| `environments[].name`          | string | Scenario identifier (e.g., `"empty"`, `"standard"`, `"large"`) |
| `environments[].description`   | string | Human-readable description. Autonoma's AI reads this to choose the right scenario |
| `environments[].fingerprint`   | string | 16-character hex hash of the scenario's data structure             |

**Example:**

```
→ POST /your-endpoint
  { "action": "discover" }

← 200 OK
  {
    "environments": [
      {
        "name": "empty",
        "description": "Brand-new organization with minimal data. Suitable for testing empty states, onboarding flows, and first-time user experiences.",
        "fingerprint": "f0e1d2c3b4a59687"
      },
      {
        "name": "standard",
        "description": "Full dataset, suitable for core workflows.",
        "fingerprint": "a1b2c3d4e5f67890"
      },
      {
        "name": "large",
        "description": "High-volume dataset for pagination, filtering, and performance behavior.",
        "fingerprint": "45aef220d52320cd"
      }
    ]
  }
```

### Up

Autonoma says: "Create the `standard` scenario for test run `run-abc123`."

**Request fields:**

| Field         | Type     | Description                                                                    |
| ------------- | -------- | ------------------------------------------------------------------------------ |
| `action`      | `"up"`   | Always the string `"up"`                                                       |
| `environment` | string   | The scenario name (must match one returned by `discover`)                      |
| `testRunId`   | string   | Unique identifier for this test run. Use it to make emails, org names unique   |

**Response fields:**

| Field        | Type   | Description                                                                     |
| ------------ | ------ | ------------------------------------------------------------------------------- |
| `auth`       | object | Credentials Autonoma uses to act as the test user                               |
| `auth.cookies` | array | Session cookies to inject. Each has `name`, `value`, `httpOnly`, `sameSite`, `path` |
| `refs`       | object | IDs of everything you created. These come back verbatim in `down`               |
| `refsToken`  | string | A signed (JWT or equivalent) copy of `refs`                                     |
| `metadata`   | object | Extra info for Autonoma's AI agent (email, role, org name, etc.)                |
| `expiresInSeconds` | number | Optional. How long (in seconds) before Autonoma considers this instance expired. Defaults to 7200 (2 hours). Override if your scenario data has a shorter or longer natural lifetime. |

**Example:**

```json
// → POST /your-endpoint
{
    "action": "up",
    "environment": "standard",
    "testRunId": "run-abc123"
}

// ← 200 OK
{
    "auth": {
        "cookies": [
            {
                "name": "session",
                "value": "eyJ...",
                "httpOnly": true,
                "sameSite": "lax",
                "path": "/"
            }
        ]
    },
    "refs": {
        "organizationId": "org_xyz",
        "userId": "usr_abc",
        "productIds": ["prod_1", "prod_2"]
    },
    "refsToken": "eyJhbGciOiJIUzI1NiIs...",
    "metadata": {
        "email": "test-user@example.com",
        "scenario": "standard"
    },
    "expiresInSeconds": 7200
}
```

### Down

Autonoma says: "I'm done with test run `run-abc123`. Here are the refs you gave me — delete everything."

**Request fields:**

| Field        | Type     | Description                                                     |
| ------------ | -------- | --------------------------------------------------------------- |
| `action`     | `"down"` | Always the string `"down"`                                      |
| `testRunId`  | string   | Same test run ID from the `up` call                             |
| `refs`       | object   | The exact `refs` object returned by `up`                        |
| `refsToken`  | string   | The exact `refsToken` returned by `up`                          |

**Response fields:**

| Field     | Type    | Description                             |
| --------- | ------- | --------------------------------------- |
| `ok`      | boolean | `true` if teardown completed            |

**Example:**

```json
// → POST /your-endpoint
{
    "action": "down",
    "testRunId": "run-abc123",
    "refs": {
        "organizationId": "org_xyz",
        "userId": "usr_abc",
        "productIds": ["prod_1", "prod_2"]
    },
    "refsToken": "eyJhbGciOiJIUzI1NiIs..."
}

// ← 200 OK
{ "ok": true }
```

Before deleting anything, you **must** verify the `refsToken` and confirm it matches the `refs` in the request body. This prevents anyone from crafting a fake `down` request to delete arbitrary data.

## Security Model

Three layers of security protect your endpoint, using **two separate secrets** with very different purposes.

### The Two Secrets

Your implementation requires one secret: `AUTONOMA_SIGNING_SECRET`. It is used for both HMAC request verification and for signing the teardown token (`refsToken`).

| Secret | Env Variable | Purpose |
| --- | --- | --- |
| **Signing secret** | `AUTONOMA_SIGNING_SECRET` | HMAC-SHA256 signature of every request, and signing/verifying the `refsToken` for teardown. You paste this value into the Autonoma dashboard when connecting your app. |

**Generate with `openssl`:**

```bash
openssl rand -hex 32
```

This produces a 64-character hex string (256 bits of entropy).

### Layer 1: Environment Gating

Your endpoint should **not exist in production** unless explicitly enabled. The simplest approach: return 404 when `NODE_ENV=production` (or your framework's equivalent) unless you've set a specific override flag.

This is the first line of defense. Even if someone discovers the URL, it doesn't respond in production.

### Layer 2: Request Signing (HMAC-SHA256) - uses `AUTONOMA_SIGNING_SECRET`

Every request from Autonoma includes a signature header:

```
x-signature: <hex-digest>
```

The signature is an HMAC-SHA256 of the raw request body, using the **signing secret** that both you and Autonoma know. Your endpoint must:

1. Read the raw request body (before JSON parsing)
2. Compute HMAC-SHA256 of that body using `AUTONOMA_SIGNING_SECRET`
3. Compare your result with the `x-signature` header
4. Reject if they don't match (return 401)

This guarantees every request actually came from Autonoma.

### Layer 3: Signed Refs (for `down` only) - uses `AUTONOMA_SIGNING_SECRET`

When `up` creates data, it signs the `refs` map into a token (`refsToken`) using `AUTONOMA_SIGNING_SECRET`. Autonoma stores this token and sends it back when calling `down`. When `down` receives the token:

1. Verify the token signature and expiry (24h) using `AUTONOMA_SIGNING_SECRET`
2. Decode the refs from inside the token
3. Compare them with the refs in the request body
4. Only proceed if they match exactly

This guarantees that `down` can only delete data that `up` actually created. Autonoma never sees the token internals - it just holds onto the opaque string and passes it back.

### Error Responses

Use consistent error codes so Autonoma can handle failures gracefully:

| Situation                                | HTTP Status | Error Code            |
| ---------------------------------------- | ----------- | --------------------- |
| Unknown action                           | 400         | `UNKNOWN_ACTION`      |
| Unknown scenario name                    | 400         | `UNKNOWN_ENVIRONMENT` |
| `up` fails during creation               | 500         | `UP_FAILED`           |
| `down` fails during deletion             | 500         | `DOWN_FAILED`         |
| Invalid, expired, or mismatched refs     | 403         | `INVALID_REFS_TOKEN`  |
| Missing or invalid HMAC signature        | 401         | *(no code needed)*    |

Response shape:

```json
{ "error": "Human-readable description", "code": "ERROR_CODE" }
```

## Implementing the Actions

<details>
<summary>Implementing Discover</summary>

This is the simplest action. It returns your list of scenarios with their metadata.

**What to return for each scenario:**

| Field         | Type   | Description                                                                       |
| ------------- | ------ | --------------------------------------------------------------------------------- |
| `name`        | string | Identifier (e.g., `"standard"`, `"empty"`)                                        |
| `description` | string | Human-readable description. Autonoma's AI reads this to choose the right scenario |
| `fingerprint` | string | A 16-character hex hash of the scenario's data structure                           |

```
function handleDiscover():
    scenarios = getAllRegisteredScenarios()
    return {
        environments: scenarios.map(s => ({
            name: s.name,
            description: s.description,
            fingerprint: s.computeFingerprint()
        }))
    }
```

</details>

<details>
<summary>Implementing Up</summary>

This is where the real work happens. `up` receives a scenario name and a test run ID, and creates all the data.

**Step by step:**

1. **Find the scenario** by name. Return 400 `UNKNOWN_ENVIRONMENT` if not found.
2. **Call the scenario's `up` function**, which creates all database records and collects their IDs into a `refs` map.
3. **Sign the refs** into a JWT token (the `refsToken`).
4. **Create auth credentials** — whatever your app needs to log in as the test user.
5. **Return everything**: auth, refs, refsToken, metadata.

**Important design decisions:**

- **Every `up` creates a NEW isolated dataset.** Use the `testRunId` to make names/emails unique (e.g., `test-user-run-abc123@example.com`). This allows parallel test runs without collisions.
- **Collect ALL created IDs into `refs`.** You'll need them for teardown.
- **Handle creation order carefully.** Parent records must be created before children.
- **Return `expiresInSeconds` if your data has a natural TTL.** Autonoma defaults to 2 hours. If your scenario creates time-sensitive records (e.g., OTP codes, pending invitations), override this to match their lifetime.

</details>

<details>
<summary>Implementing Down</summary>

`down` receives the refs map and the signed token, verifies them, and deletes everything.

**Step by step:**

1. **Verify the `refsToken`** — decode the JWT, check it hasn't expired (24h max), extract the refs.
2. **Compare decoded refs with request refs** — they must match exactly. If someone sends a valid token but swaps the refs in the request body, reject with 403.
3. **Determine which scenario** was used (from the refs structure, or store the scenario name in refs).
4. **Call the scenario's `down` function**, which deletes all records.
5. **Return** `{ ok: true }`.

:::caution[Why verify before deleting?]
Without verification, anyone who can reach your endpoint could send:
```json
{ "action": "down", "refs": { "orgId": "PRODUCTION_ORG_ID" } }
```
...and delete your production data. The signed token makes this impossible.
:::

</details>

## Scenario Fingerprinting

Each scenario has a **fingerprint** — a hash of its structural definition. It serves two purposes: **drift detection** and **validation**.

### The problem it solves

You add a new field to your `users` table, but forget to update the scenario's `up` function to populate it. Now your tests are running against incomplete data. The fingerprint catches this.

### How Autonoma uses it

Autonoma stores the fingerprint from your last successful run. Before each new test run, it calls `discover` and compares fingerprints. If they differ, Autonoma knows the scenario data has changed and can re-analyze accordingly.

### How to build it

1. Define a **descriptor** object that mirrors the structure of what your `up` creates
2. JSON-serialize it and hash with SHA-256
3. Take the first 16 hex characters

```
descriptor = {
    users: 4,
    products: { count: 10, statuses: { active: 8, draft: 2 } },
    orders: 5
}
fingerprint = sha256(JSON.stringify(descriptor)).substring(0, 16)
```

**The key property:** The fingerprint is computed from the same constants your `up` function reads. When you add a product, the descriptor's count changes, and the fingerprint changes automatically.

:::tip
The fingerprint must be deterministic. Don't include timestamps, random values, or anything that changes between requests. Call `discover` twice — the fingerprints must be identical.
:::

## Signed Refs — How Teardown Stays Safe

This is the most important security concept. Here's the full flow:

```
┌── up ──────────────────────────────────────────────────────────┐
│                                                                 │
│  1. Create org, users, products...                              │
│  2. Collect IDs: refs = { orgId, userIds, ... }                 │
│  3. Sign: refsToken = JWT.sign({ refs }, INTERNAL_SECRET)       │
│  4. Return both refs AND refsToken                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
         │
         │  (Autonoma stores refsToken, runs tests)
         │
         ▼
┌── down ────────────────────────────────────────────────────────┐
│                                                                 │
│  1. Receive refs AND refsToken                                  │
│  2. Verify: decoded = JWT.verify(refsToken, INTERNAL_SECRET)    │
│  3. Compare: decoded.refs === request.refs?                     │
│     NO  → 403 INVALID_REFS_TOKEN                                │
│     YES → proceed to delete                                     │
│  4. Delete everything in refs                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

Autonoma treats `refsToken` as an opaque string - stores it after `up` and sends it back in `down`.

**What this prevents:**

| Attack                                           | Why it fails                      |
| ------------------------------------------------ | --------------------------------- |
| Attacker sends fake refs with made-up IDs        | No valid token → rejected         |
| Attacker sends a valid token but changes the refs | Refs don't match token → rejected |
| Attacker replays a token from a week ago         | Token expired (24h) → rejected    |

No server-side state needed. The token itself is the proof.

## Authentication Strategies

The `auth` object in your `up` response tells Autonoma how to log in as the test user.

<details>
<summary>Option A: Session Cookies (most common)</summary>

If your app uses cookie-based sessions, generate a session during `up` and return the cookies:

```json
{
    "auth": {
        "cookies": [
            {
                "name": "session-token",
                "value": "abc123",
                "httpOnly": true,
                "sameSite": "lax",
                "path": "/"
            }
        ]
    }
}
```

Works with: NextAuth, custom JWT cookies, session stores, etc.

</details>

<details>
<summary>Option B: Bearer Token / Headers</summary>

If your app uses API tokens or bearer auth:

```json
{
    "auth": {
        "headers": {
            "Authorization": "Bearer eyJ..."
        }
    }
}
```

Works with: Auth0, custom API keys, OAuth tokens, etc.

</details>

<details>
<summary>Option C: Username + Password</summary>

If your app has a login page and you want Autonoma to log in through it:

```json
{
    "auth": {
        "credentials": {
            "email": "test-user@example.com",
            "password": "TestP@ssw0rd123!"
        }
    }
}
```

</details>

Options A and B can be used together. For web applications, cookies or headers are preferred because Autonoma can inject them directly without navigating a login page.

:::caution[Mobile apps: use credentials only]
For **iOS and Android** applications, cookies and bearer tokens/headers (Options A and B) are **not supported**. Autonoma cannot inject cookies or HTTP headers into native mobile apps - there is no browser context to set them in.

Instead, use **Option C (Username + Password)** and return credentials that Autonoma's agent can use to log in through your app's login screen. The agent will navigate the login flow just like a real user would.
:::

## Writing Your Teardown Function

Teardown is where most bugs hide. Key rules:

<details>
<summary>Rule 1: Delete in reverse creation order</summary>

If `up` creates: org → users → products → orders, then `down` must delete: orders → products → users → org. Foreign key constraints enforce this.

</details>

<details>
<summary>Rule 2: Don't rely on ORM cascade behavior</summary>

ORMs have inconsistent cascade defaults. Explicit deletion in reverse order is always safer.

</details>

<details>
<summary>Rule 3: Handle circular foreign keys</summary>

If your schema has tables that reference each other, you can't delete either table first.

**Solution:** Use raw SQL in a transaction to temporarily drop the FK constraint:

```sql
BEGIN;
  ALTER TABLE components DROP CONSTRAINT components_default_version_id_fkey;
  DELETE FROM component_versions WHERE org_id = $1;
  DELETE FROM components WHERE org_id = $1;
  ALTER TABLE components ADD CONSTRAINT components_default_version_id_fkey
    FOREIGN KEY (default_version_id) REFERENCES component_versions(id);
COMMIT;
```

</details>

<details>
<summary>Rule 4: Handle nested/self-referential records</summary>

If a table references itself (e.g., folders with parent folders), delete children before parents:

```sql
DELETE FROM folders WHERE org_id = $1 AND parent_id IS NOT NULL;
DELETE FROM folders WHERE org_id = $1;
```

</details>

## Testing Your Implementation

Write integration tests that cover the full lifecycle.

<details>
<summary>Happy Path Tests</summary>

| Test                        | What it verifies                                              |
| --------------------------- | ------------------------------------------------------------- |
| `discover` returns scenarios | Correct names, descriptions, 16-char fingerprints             |
| Fingerprints are stable     | Calling `discover` twice returns identical fingerprints        |
| `up` creates data           | Query your database after `up` — verify entity counts          |
| `down` deletes data         | Query your database after `down` — verify everything is gone   |
| Full round-trip             | `up` → verify data exists → `down` → verify data is gone      |

</details>

<details>
<summary>Security Tests</summary>

| Test              | What it verifies                                       |
| ----------------- | ------------------------------------------------------ |
| Tampered token    | Send a random string as `refsToken` → expect 403       |
| Mismatched refs   | Send a valid token but change the refs body → expect 403 |
| Expired token     | Create a token with past expiry → expect 403           |
| Missing signature | Send a request without `x-signature` → expect 401      |
| Invalid signature | Send a request with a wrong signature → expect 401     |

</details>

<details>
<summary>Error Handling Tests</summary>

| Test                | What it verifies                               |
| ------------------- | ---------------------------------------------- |
| Unknown action      | `{ action: "explode" }` → expect 400           |
| Unknown environment | `{ action: "up", environment: "nonexistent" }` → expect 400 |
| Malformed body      | Send non-JSON → expect 400                      |

</details>

## Quick Test Script

The fastest way to verify your implementation is the one-liner test script. It runs the full `discover` -> `up` -> `down` lifecycle against your endpoint and validates every response.

```bash
curl -fsSL https://docs.agent.autonoma.app/test-scenario.sh | bash -s -- \
  --url https://your-app.com/api/autonoma \
  --secret your-signing-secret \
  --scenario standard
```

The `--secret` flag takes your `AUTONOMA_SIGNING_SECRET` value (the HMAC signing secret shared with Autonoma).

**What it does:**

1. Calls `discover` and verifies your scenario is listed with the correct response shape
2. Calls `up` for the specified scenario and validates it returns `auth`, `refs`, and `refsToken`
3. Calls `down` with the refs from `up` and verifies teardown succeeds

**Options:**

| Flag | Description |
| --- | --- |
| `--url URL` | **(required)** Your Environment Factory endpoint URL |
| `--secret SECRET` | **(required)** Your `AUTONOMA_SIGNING_SECRET` value |
| `--scenario NAME` | **(required)** Scenario to test (e.g., `standard`, `empty`, `large`) |
| `--keep-up` | Skip teardown - leaves data in place so you can inspect it |
| `--skip-discover` | Go straight to `up`/`down` without calling `discover` first |
| `--test-run-id ID` | Use a fixed test run ID instead of generating one |
| `--timeout SECONDS` | Per-request timeout (default: 30) |

Run with `--help` for full usage:

```bash
curl -fsSL https://docs.agent.autonoma.app/test-scenario.sh | bash -s -- --help
```

**Requirements:** `curl`, `openssl`, `python3` (all pre-installed on macOS and most Linux distributions).

## Manual Testing with curl

<details>
<summary>curl commands for discover, up, and down</summary>

Set your signing secret first:

```bash
export SECRET="your-signing-secret"  # AUTONOMA_SIGNING_SECRET value
export BASE_URL="https://your-app.example.com"
```

**Discover:**

```bash
BODY='{"action":"discover"}'
SIG=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/.*= //')
curl -s -X POST "$BASE_URL/api/autonoma" \
  -H "Content-Type: application/json" \
  -H "x-signature: $SIG" \
  -d "$BODY" | jq .
```

**Up:**

```bash
BODY='{"action":"up","environment":"standard","testRunId":"manual-test-001"}'
SIG=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/.*= //')
UP=$(curl -s -X POST "$BASE_URL/api/autonoma" \
  -H "Content-Type: application/json" \
  -H "x-signature: $SIG" \
  -d "$BODY")
echo "$UP" | jq .

# Save for down
REFS=$(echo "$UP" | jq -c '.refs')
TOKEN=$(echo "$UP" | jq -r '.refsToken')
```

**Down:**

```bash
BODY=$(jq -n -c --argjson refs "$REFS" --arg token "$TOKEN" \
  '{action:"down", testRunId:"manual-test-001", refs:$refs, refsToken:$token}')
SIG=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/.*= //')
curl -s -X POST "$BASE_URL/api/autonoma" \
  -H "Content-Type: application/json" \
  -H "x-signature: $SIG" \
  -d "$BODY" | jq .
```

:::note
On some systems, `openssl dgst` outputs a prefix like `SHA2-256(stdin)= `. The `sed 's/.*= //'` strips everything before the actual digest. Do **not** use `awk '{print $2}'` — it doesn't work reliably across all OpenSSL versions.
:::

</details>

## Deployment Checklist

Before sharing your endpoint URL with Autonoma:

- [ ] **Production guard works** — endpoint returns 404 in production (unless explicitly overridden)
- [ ] **Signing secret configured** — `AUTONOMA_SIGNING_SECRET` is set in your environment and matches the value in the Autonoma dashboard
- [ ] **Signing secret configured** — `AUTONOMA_SIGNING_SECRET` is set in your environment and matches the value in the Autonoma dashboard
- [ ] **`discover` returns correct data** — scenario names, descriptions, and fingerprints
- [ ] **`up` creates all entities** — spot-check counts in your database
- [ ] **Auth works** — use the returned cookies/headers to navigate your app
- [ ] **`down` deletes all entities** — no orphaned records left behind
- [ ] **`down` rejects bad tokens** — tampered, expired, and mismatched refs return 403
- [ ] **Response times acceptable** — `up` < 30s, `down` < 10s
- [ ] **Integration tests pass**
- [ ] **Test script passes** — `curl -fsSL https://docs.agent.autonoma.app/test-scenario.sh | bash -s -- --url $URL --secret $AUTONOMA_SIGNING_SECRET --scenario standard` succeeds for all scenarios

## Troubleshooting

| Problem                              | Cause                                    | Fix                                                       |
| ------------------------------------ | ---------------------------------------- | --------------------------------------------------------- |
| `up` fails with FK violation         | Creating child before parent             | Check your creation order — parents first                 |
| `down` fails with FK violation       | Deleting parent before child             | Check your deletion order — children first                |
| `down` fails on circular FK          | Two tables reference each other          | Drop the constraint temporarily in a transaction          |
| Signature verification fails locally | Secret not set or wrong value            | Check `AUTONOMA_SIGNING_SECRET` matches between your server and the Autonoma dashboard |
| Fingerprint changes between calls    | Non-deterministic data in descriptor     | Remove timestamps, random values from descriptor          |
| `openssl dgst` output looks wrong    | Different OpenSSL versions               | Use `sed 's/.*= //'` instead of `awk '{print $2}'`       |
| Token expired immediately            | Clock skew or wrong expiry               | Check server time, ensure JWT expiry is `24h` not `-24h`  |
| Parallel tests collide               | Same email/name used across runs         | Use `testRunId` in all unique fields                      |
