import { describe, expect, it } from "vitest";
import { ScenarioRecipesFileSchema } from "./scenarios";

const baseRecipe = {
    name: "standard",
    description: "Standard scenario",
    create: {
        Organization: [{ name: "Acme Corp" }],
    },
    validation: {
        status: "validated",
        method: "checkScenario",
        phase: "ok",
    },
};

const baseFile = {
    version: 1,
    source: {
        discoverPath: "autonoma/discover.json",
        scenariosPath: "autonoma/scenarios.md",
    },
    validationMode: "sdk-check",
};

describe("ScenarioRecipesFileSchema", () => {
    it("accepts concrete recipes without variables", () => {
        const result = ScenarioRecipesFileSchema.safeParse({
            ...baseFile,
            recipes: [baseRecipe],
        });

        expect(result.success).toBe(true);
    });

    it("accepts recipes with typed variables", () => {
        const result = ScenarioRecipesFileSchema.safeParse({
            ...baseFile,
            recipes: [
                {
                    ...baseRecipe,
                    create: {
                        User: [{ email: "{{owner_email}}", firstName: "{{owner_first_name}}" }],
                    },
                    variables: {
                        owner_email: {
                            strategy: "derived",
                            source: "testRunId",
                            format: "owner+{testRunId}@example.com",
                        },
                        owner_first_name: {
                            strategy: "faker",
                            generator: "person.firstName",
                        },
                    },
                },
            ],
        });

        expect(result.success).toBe(true);
    });

    it("rejects invalid variable strategy definitions", () => {
        const result = ScenarioRecipesFileSchema.safeParse({
            ...baseFile,
            recipes: [
                {
                    ...baseRecipe,
                    variables: {
                        owner_email: {
                            strategy: "custom",
                        },
                    },
                },
            ],
        });

        expect(result.success).toBe(false);
    });
});
