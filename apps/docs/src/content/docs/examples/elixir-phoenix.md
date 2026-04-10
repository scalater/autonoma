---
title: "Elixir/Phoenix Implementation"
description: "Autonoma Environment Factory with Elixir, Phoenix Framework, and Ecto + PostgreSQL."
---

:::note[Prerequisites]
Read the [Environment Factory Guide](/guides/environment-factory/) first for concepts. This doc is the code.

**Stack:** Elixir 1.17+, Phoenix 1.7+ (JSON API), Ecto ORM, PostgreSQL, JOSE for JWT, ExUnit for integration tests.
:::

## File Structure

```
lib/
├── my_app_web/
│   ├── controllers/
│   │   └── autonoma_controller.ex    ← The POST endpoint
│   └── router.ex                     ← Route registration
│
└── my_app/
    └── autonoma/
        ├── scenario.ex               ← Scenario behaviour (like an interface)
        ├── scenario_registry.ex      ← Finds scenarios by name
        ├── refs_token.ex             ← Signs and verifies refs with JOSE/JWT
        ├── signature.ex              ← HMAC-SHA256 signature verification
        ├── teardown.ex               ← Shared teardown: deletes org data in FK order
        └── scenarios/
            ├── empty_scenario.ex     ← Minimal scenario: org + user only
            └── standard_scenario.ex  ← Full scenario with all test data

test/integration/
└── autonoma_test.exs                 ← Integration tests
```

## Step 1: Define the Scenario Behaviour

Elixir uses behaviours (similar to interfaces/abstract classes). Every scenario implements this contract.

**File: `lib/my_app/autonoma/scenario.ex`**

```elixir
defmodule MyApp.Autonoma.Scenario do
  @type refs :: %{String.t() => any()}

  @type up_result :: %{
    organization_id: String.t(),
    user_id: String.t(),
    user_email: String.t(),
    refs: refs()
  }

  @type meta :: %{
    name: String.t(),
    description: String.t(),
    fingerprint: String.t()
  }

  @callback name() :: String.t()
  @callback description() :: String.t()
  @callback descriptor() :: map()
  @callback up(test_run_id :: String.t()) :: {:ok, up_result()} | {:error, term()}
  @callback down(refs :: refs()) :: :ok | {:error, term()}

  @doc "Compute a 16-char hex fingerprint from the descriptor."
  def fingerprint(module) do
    module.descriptor()
    |> Jason.encode!()
    |> then(&:crypto.hash(:sha256, &1))
    |> Base.encode16(case: :lower)
    |> String.slice(0, 16)
  end

  @doc "Return the scenario metadata for discover."
  def meta(module) do
    %{
      name: module.name(),
      description: module.description(),
      fingerprint: fingerprint(module)
    }
  end
end
```

## Step 2: Build the Refs Token Module

Uses the JOSE library for JWT signing/verification.

**File: `lib/my_app/autonoma/refs_token.ex`**

```elixir
defmodule MyApp.Autonoma.RefsToken do
  @algorithm "HS256"
  @expiry_seconds 86_400  # 24 hours

  defp secret do
    Application.fetch_env!(:my_app, :autonoma_jwt_secret)
  end

  @doc "Sign refs into a JWT token."
  def sign_refs(refs) do
    signer = JOSE.JWS.from_map(%{"alg" => @algorithm})
    jwk = JOSE.JWK.from_oct(secret())

    payload = %{
      "refs" => refs,
      "exp" => System.system_time(:second) + @expiry_seconds
    }

    {_, token} = JOSE.JWT.sign(jwk, signer, payload) |> JOSE.JWS.compact()
    token
  end

  @doc "Verify a refs token. Returns {:ok, refs} or {:error, reason}."
  def verify_refs(token) do
    jwk = JOSE.JWK.from_oct(secret())

    case JOSE.JWT.verify_strict(jwk, [@algorithm], token) do
      {true, %JOSE.JWT{fields: %{"refs" => refs, "exp" => exp}}, _} ->
        if exp > System.system_time(:second) do
          {:ok, refs}
        else
          {:error, "Token expired"}
        end

      _ ->
        {:error, "Invalid token"}
    end
  end

  @doc "Check if two refs maps match."
  def refs_match?(token_refs, request_refs) do
    Jason.encode!(token_refs) == Jason.encode!(request_refs)
  end
end
```

## Step 3: HMAC Signature Verification

**File: `lib/my_app/autonoma/signature.ex`**

```elixir
defmodule MyApp.Autonoma.Signature do
  @doc "Verify the x-signature header against the raw request body."
  def verify(raw_body, signature) do
    secret = Application.fetch_env!(:my_app, :autonoma_signing_secret)
    expected = :crypto.mac(:hmac, :sha256, secret, raw_body) |> Base.encode16(case: :lower)

    Plug.Crypto.secure_compare(expected, signature)
  end
end
```

## Step 4: Empty Scenario

**File: `lib/my_app/autonoma/scenarios/empty_scenario.ex`**

```elixir
defmodule MyApp.Autonoma.Scenarios.EmptyScenario do
  @behaviour MyApp.Autonoma.Scenario

  alias MyApp.Repo
  alias MyApp.Accounts.{Organization, User}
  alias MyApp.Autonoma.Teardown

  @impl true
  def name, do: "empty"

  @impl true
  def description do
    "An organization with no data. Used for testing empty states and onboarding flows."
  end

  @impl true
  def descriptor do
    %{org: %{has_quota: true}, users: 1, applications: 0, tests: 0}
  end

  @impl true
  def up(test_run_id) do
    Repo.transaction(fn ->
      {:ok, org} =
        %Organization{}
        |> Organization.changeset(%{name: "Autonoma QA Empty [#{test_run_id}]"})
        |> Repo.insert()

      {:ok, user} =
        %User{}
        |> User.changeset(%{
          name: "QA Empty",
          email: "qa-empty-#{test_run_id}@autonoma.dev",
          organization_id: org.id
        })
        |> Repo.insert()

      %{
        organization_id: org.id,
        user_id: user.id,
        user_email: user.email,
        refs: %{
          "organizationId" => org.id,
          "userId" => user.id
        }
      }
    end)
  end

  @impl true
  def down(refs) do
    Teardown.teardown_organization(refs["organizationId"])
  end
end
```

## Step 5: The Controller

**File: `lib/my_app_web/controllers/autonoma_controller.ex`**

```elixir
defmodule MyAppWeb.AutonomaController do
  use MyAppWeb, :controller

  alias MyApp.Autonoma.{Scenario, ScenarioRegistry, RefsToken, Signature}

  plug :verify_environment
  plug :verify_signature

  def handle(conn, _params) do
    raw_body = conn.assigns[:raw_body]
    body = Jason.decode!(raw_body)

    case body["action"] do
      "discover" -> handle_discover(conn)
      "up"       -> handle_up(conn, body["environment"], body["testRunId"])
      "down"     -> handle_down(conn, body["refs"], body["refsToken"])
      _          -> error_response(conn, "Unknown action", "UNKNOWN_ACTION", 400)
    end
  end

  defp handle_discover(conn) do
    environments =
      ScenarioRegistry.all()
      |> Enum.map(&Scenario.meta/1)

    json(conn, %{environments: environments})
  end

  defp handle_up(conn, environment, test_run_id) do
    case ScenarioRegistry.find(environment) do
      nil ->
        error_response(conn, "Unknown environment: #{environment}", "UNKNOWN_ENVIRONMENT", 400)

      module ->
        case module.up(test_run_id) do
          {:ok, result} ->
            refs_token = RefsToken.sign_refs(result.refs)
            bypass_token = MyApp.Auth.create_bypass_token(result.user_email, result.organization_id)

            json(conn, %{
              auth: %{headers: %{"Authorization" => "Bearer #{bypass_token}"}},
              refs: result.refs,
              refsToken: refs_token,
              metadata: %{
                organizationId: result.organization_id,
                email: result.user_email,
                scenario: environment
              }
            })

          {:error, reason} ->
            error_response(conn, "Up failed: #{inspect(reason)}", "UP_FAILED", 500)
        end
    end
  end

  defp handle_down(conn, refs, refs_token) do
    with {:ok, token_refs} <- RefsToken.verify_refs(refs_token),
         true <- RefsToken.refs_match?(token_refs, refs) do
      case ScenarioRegistry.find_for_refs(refs) do
        nil ->
          error_response(conn, "No scenario for refs", "DOWN_FAILED", 400)

        module ->
          case module.down(refs) do
            :ok -> json(conn, %{ok: true})
            {:error, reason} -> error_response(conn, "Down failed: #{inspect(reason)}", "DOWN_FAILED", 500)
          end
      end
    else
      {:error, reason} -> error_response(conn, reason, "INVALID_REFS_TOKEN", 403)
      false -> error_response(conn, "Refs do not match token", "INVALID_REFS_TOKEN", 403)
    end
  end

  # Plugs

  defp verify_environment(conn, _opts) do
    if Application.get_env(:my_app, :env) == :prod &&
       Application.get_env(:my_app, :autonoma_factory_enabled) != true do
      conn |> send_resp(404, "") |> halt()
    else
      conn
    end
  end

  defp verify_signature(conn, _opts) do
    raw_body = read_raw_body(conn)
    signature = get_req_header(conn, "x-signature") |> List.first()

    if signature != nil && Signature.verify(raw_body, signature) do
      assign(conn, :raw_body, raw_body)
    else
      conn
      |> put_status(401)
      |> json(%{error: "Invalid or missing signature"})
      |> halt()
    end
  end

  defp read_raw_body(conn) do
    {:ok, body, _conn} = Plug.Conn.read_body(conn)
    body
  end

  defp error_response(conn, message, code, status) do
    conn
    |> put_status(status)
    |> json(%{error: message, code: code})
  end
end
```

## Step 6: Route Registration

**File: `lib/my_app_web/router.ex`** (add to your existing router)

```elixir
scope "/api", MyAppWeb do
  pipe_through :api

  post "/autonoma", AutonomaController, :handle
end
```

## Step 7: Teardown with Ecto

Ecto uses explicit multi-queries. Delete in reverse FK order:

**File: `lib/my_app/autonoma/teardown.ex`**

```elixir
defmodule MyApp.Autonoma.Teardown do
  alias MyApp.Repo
  import Ecto.Query

  def teardown_organization(organization_id) do
    Repo.transaction(fn ->
      # Delete children first, parents last
      delete_all(MyApp.Runs.Step, :run, organization_id)
      delete_all(MyApp.Runs.Run, :organization_id, organization_id)
      delete_all(MyApp.Tests.Test, :organization_id, organization_id)
      delete_all(MyApp.Tags.Tag, :organization_id, organization_id)
      delete_all(MyApp.Apps.ApplicationVersion, :organization_id, organization_id)
      delete_all(MyApp.Apps.Application, :organization_id, organization_id)

      # Folders — children first
      from(f in MyApp.Folders.Folder,
        where: f.organization_id == ^organization_id and not is_nil(f.parent_id)
      ) |> Repo.delete_all()

      from(f in MyApp.Folders.Folder,
        where: f.organization_id == ^organization_id
      ) |> Repo.delete_all()

      # Users, then organization
      delete_all(MyApp.Accounts.User, :organization_id, organization_id)
      Repo.get!(MyApp.Accounts.Organization, organization_id) |> Repo.delete!()
    end)

    :ok
  end

  defp delete_all(schema, field, organization_id) do
    from(s in schema, where: field(s, ^field) == ^organization_id)
    |> Repo.delete_all()
  end
end
```

## Key Differences from Node.js

| Aspect                | Node.js (Express/Next.js)            | Elixir (Phoenix)                            |
| --------------------- | ------------------------------------ | ------------------------------------------- |
| **Abstract class**    | `class extends ScenarioBuilder`      | `@behaviour Scenario` + callbacks           |
| **JWT library**       | `jsonwebtoken`                       | `jose` (Erlang JOSE)                        |
| **HMAC**              | `crypto.createHmac()`               | `:crypto.mac(:hmac, ...)`                   |
| **ORM**               | Prisma (query builder)               | Ecto (composable queries)                   |
| **Error handling**    | try/catch + error responses          | `with` chains + pattern matching            |
| **Transactions**      | `db.$transaction()`                  | `Repo.transaction()`                        |
| **Raw body access**   | Middleware (`express.raw()`)         | `Plug.Conn.read_body()` in plug             |
| **Environment guard** | `process.env.NODE_ENV`               | `Application.get_env(:my_app, :env)`        |

## Dependencies

Add to `mix.exs`:

```elixir
defp deps do
  [
    {:jose, "~> 1.11"},        # JWT signing/verification
    {:jason, "~> 1.4"},        # JSON encoding
    # ... your existing deps
  ]
end
```

## Configuration

**File: `config/dev.exs`**

```elixir
config :my_app,
  autonoma_signing_secret: System.get_env("AUTONOMA_SIGNING_SECRET"),
  autonoma_jwt_secret: System.get_env("AUTONOMA_JWT_SECRET"),
  autonoma_factory_enabled: true
```

**File: `config/prod.exs`**

```elixir
config :my_app,
  autonoma_factory_enabled: false  # Override with env var if needed
```
