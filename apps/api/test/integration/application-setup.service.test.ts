import { randomBytes } from "node:crypto";
import { ApplicationArchitecture } from "@autonoma/db";
import { EncryptionHelper, ScenarioManager } from "@autonoma/scenario";
import { expect } from "vitest";
import { ApplicationSetupService } from "../../src/application-setup/application-setup.service";
import { apiTestSuite } from "../api-test";

apiTestSuite({
    name: "application-setup-service",
    seed: async ({ harness }) => {
        const app = await harness.services.applications.createApplication({
            name: "Application Setup Test",
            organizationId: harness.organizationId,
            architecture: ApplicationArchitecture.WEB,
            url: "https://example.com",
            file: "s3://bucket/file.png",
        });

        const encryptionHelper = new EncryptionHelper(randomBytes(32).toString("hex"));
        const scenarioManager = new ScenarioManager(harness.db, encryptionHelper);
        const service = new ApplicationSetupService(
            harness.db,
            harness.generationProvider,
            harness.services.onboarding,
            scenarioManager,
        );
        const { id: setupId } = await service.createSetup(harness.userId, harness.organizationId, app.id, app.name);

        return { app, setupId, service };
    },
    cases: (test) => {
        test("createSetup moves onboarding from install to working", async ({ harness }) => {
            const app = await harness.services.applications.createApplication({
                name: "Onboarding Progress Test",
                organizationId: harness.organizationId,
                architecture: ApplicationArchitecture.WEB,
                url: "https://example.com",
                file: "s3://bucket/file.png",
            });

            const encryptionHelper = new EncryptionHelper(randomBytes(32).toString("hex"));
            const scenarioManager = new ScenarioManager(harness.db, encryptionHelper);
            const service = new ApplicationSetupService(
                harness.db,
                harness.generationProvider,
                harness.services.onboarding,
                scenarioManager,
            );

            await service.createSetup(harness.userId, harness.organizationId, app.id, app.name);

            const onboarding = await harness.db.onboardingState.findUnique({
                where: { applicationId: app.id },
            });
            expect(onboarding?.step).toBe("working");
            expect(onboarding?.agentConnectedAt).not.toBeNull();
        });

        test("uploadArtifacts persists non-recipe artifacts and emits file events", async ({
            harness,
            seedResult: { app, setupId, service },
        }) => {
            await service.uploadArtifacts(setupId, harness.organizationId, {
                artifacts: [
                    {
                        name: "discover.json",
                        folder: "autonoma",
                        content: JSON.stringify({
                            schema: { models: [], edges: [], relations: [], scopeField: "organizationId" },
                        }),
                    },
                ],
            });

            const artifacts = await harness.db.applicationSetupArtifact.findMany({
                where: { setupId },
                orderBy: { path: "asc" },
            });
            expect(artifacts).toHaveLength(1);
            expect(artifacts[0]?.applicationId).toBe(app.id);
            expect(artifacts[0]?.path).toBe("autonoma/discover.json");

            const events = await harness.db.applicationSetupEvent.findMany({
                where: { setupId, type: "file.created" },
                orderBy: { createdAt: "asc" },
            });
            expect(events.map((event) => (event.data as { filePath?: string }).filePath)).toContain(
                "autonoma/discover.json",
            );

            const scenarios = await harness.db.scenario.findMany({
                where: { applicationId: app.id, isDisabled: false },
            });
            expect(scenarios).toHaveLength(0);
        });

        test("uploadArtifacts rejects scenario recipes in the generic artifact endpoint", async ({
            harness,
            seedResult: { setupId, service },
        }) => {
            await expect(
                service.uploadArtifacts(setupId, harness.organizationId, {
                    artifacts: [
                        {
                            name: "scenario-recipes.json",
                            folder: "autonoma",
                            content: JSON.stringify({
                                version: 1,
                                source: {
                                    discoverPath: "autonoma/discover.json",
                                    scenariosPath: "autonoma/scenarios.md",
                                },
                                validationMode: "sdk-check",
                                recipes: [
                                    {
                                        name: "standard",
                                        description: "standard",
                                        create: { Organization: [{ _alias: "org1", name: "Acme Corp" }] },
                                        validation: { status: "validated", method: "checkScenario", phase: "ok" },
                                    },
                                ],
                            }),
                        },
                    ],
                }),
            ).rejects.toThrow("SCENARIO_RECIPES_MUST_USE_VERSIONED_ENDPOINT");
        });

        test("uploadScenarioRecipeVersions stores fixture JSON and snapshot-scoped schema data", async ({
            harness,
            seedResult: { app, setupId, service },
        }) => {
            const result = await service.uploadScenarioRecipeVersions(setupId, harness.organizationId, {
                version: 1,
                source: {
                    discoverPath: "autonoma/discover.json",
                    scenariosPath: "autonoma/scenarios.md",
                },
                validationMode: "sdk-check",
                recipes: [
                    {
                        name: "standard",
                        description: "standard",
                        create: { Organization: [{ _alias: "org1", name: "Acme Corp" }] },
                        validation: { status: "validated", method: "checkScenario", phase: "ok" },
                    },
                ],
            });

            expect(result.ok).toBe(true);
            expect(result.scenarioCount).toBe(1);

            const scenarios = await harness.db.scenario.findMany({
                where: { applicationId: app.id, isDisabled: false },
                select: {
                    id: true,
                    name: true,
                    activeRecipeVersionId: true,
                    lastSeenFingerprint: true,
                },
            });
            const activeSnapshotId = (
                await harness.db.application.findUniqueOrThrow({
                    where: { id: app.id },
                    select: {
                        mainBranch: {
                            select: {
                                activeSnapshotId: true,
                            },
                        },
                    },
                })
            ).mainBranch?.activeSnapshotId;
            const schemaSnapshots = await harness.db.scenarioSchemaSnapshot.findMany({
                where: { applicationId: app.id },
                select: { snapshotId: true, structureJson: true },
            });
            const recipeVersions = await harness.db.scenarioRecipeVersion.findMany({
                where: { applicationId: app.id },
                select: { fixtureJson: true, fingerprint: true, schemaSnapshotId: true, snapshotId: true },
            });

            expect(scenarios).toHaveLength(1);
            expect(scenarios[0]?.name).toBe("standard");
            expect(scenarios[0]?.activeRecipeVersionId).toBeTruthy();
            expect(scenarios[0]?.lastSeenFingerprint).toBeTruthy();
            expect(activeSnapshotId).toBeTruthy();
            expect(schemaSnapshots).toHaveLength(1);
            expect(schemaSnapshots[0]?.snapshotId).toBe(activeSnapshotId);
            expect(recipeVersions).toHaveLength(1);
            expect(recipeVersions[0]?.fingerprint).toBeTruthy();
            expect(recipeVersions[0]?.schemaSnapshotId).toBeTruthy();
            expect(recipeVersions[0]?.snapshotId).toBe(activeSnapshotId);

            const recipe = recipeVersions[0]?.fixtureJson as any;
            expect(recipe.name).toBe("standard");
            expect(recipe.description).toBe("standard");
            expect(recipe.create).toEqual({ Organization: [{ _alias: "org1", name: "Acme Corp" }] });
            expect(recipe.validation).toEqual({ status: "validated", method: "checkScenario", phase: "ok" });
        });
    },
});
