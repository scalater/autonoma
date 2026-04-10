import { describe, expect, it } from "vitest";
import { buildExecutionPrompt } from "./build-execution-prompt";

describe("buildExecutionPrompt", () => {
    it("returns the base prompt when custom instructions are empty", () => {
        expect(buildExecutionPrompt("Run the smoke test", "   ")).toBe("Run the smoke test");
    });

    it("appends application-specific instructions when present", () => {
        expect(buildExecutionPrompt("Run the smoke test", "Always click the second link.")).toContain(
            "## Application-specific instructions",
        );
        expect(buildExecutionPrompt("Run the smoke test", "Always click the second link.")).toContain(
            "Always click the second link.",
        );
    });

    it("prepends credentials as variable references when present", () => {
        const result = buildExecutionPrompt("Run the smoke test", undefined, {
            email: "user@test.com",
            password: "secret",
        });
        expect(result).toContain("Before starting the test, log in");
        expect(result).toContain("- email: {{email}}");
        expect(result).toContain("- password: {{password}}");
        expect(result).not.toContain("user@test.com");
        expect(result).not.toContain("secret");
        expect(result).toContain("Run the smoke test");
    });

    it("credentials appear before the base prompt", () => {
        const result = buildExecutionPrompt("Run the smoke test", undefined, {
            email: "user@test.com",
            password: "secret",
        });
        expect(result.indexOf("log in")).toBeLessThan(result.indexOf("Run the smoke test"));
    });

    it("ignores empty credentials object", () => {
        expect(buildExecutionPrompt("Run the smoke test", undefined, {})).toBe("Run the smoke test");
    });

    it("includes recipe variables section with values and references", () => {
        const result = buildExecutionPrompt("Run the smoke test", undefined, undefined, {
            org_name: "Acme Labs",
            owner_email: "owner+run-123@example.test",
        });
        expect(result).toContain("dynamic data");
        expect(result).toContain('- org_name: "Acme Labs" (reference as {{org_name}})');
        expect(result).toContain('- owner_email: "owner+run-123@example.test" (reference as {{owner_email}})');
        expect(result).toContain("Run the smoke test");
    });

    it("recipe variables appear before the base prompt", () => {
        const result = buildExecutionPrompt("Run the smoke test", undefined, undefined, {
            org_name: "Acme Labs",
        });
        expect(result.indexOf("dynamic data")).toBeLessThan(result.indexOf("Run the smoke test"));
    });

    it("ignores empty recipe variables object", () => {
        expect(buildExecutionPrompt("Run the smoke test", undefined, undefined, {})).toBe("Run the smoke test");
    });

    it("includes both credentials and recipe variables sections", () => {
        const result = buildExecutionPrompt(
            "Run the smoke test",
            undefined,
            { email: "user@test.com", password: "secret" },
            { org_name: "Acme Labs" },
        );
        expect(result).toContain("log in");
        expect(result).toContain("- email: {{email}}");
        expect(result).toContain("dynamic data");
        expect(result).toContain('- org_name: "Acme Labs"');
        // Credentials before recipe variables before base prompt
        expect(result.indexOf("log in")).toBeLessThan(result.indexOf("dynamic data"));
        expect(result.indexOf("dynamic data")).toBeLessThan(result.indexOf("Run the smoke test"));
    });
});
