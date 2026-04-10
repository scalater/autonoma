import { writeFile } from "node:fs/promises";
import type { PrismaClient } from "@autonoma/db";
import { GenerationSubject, RunSubject, type ScenarioManager, type ScenarioSubject } from "@autonoma/scenario";

const INSTANCE_ID_OUTPUT_PATH = "/tmp/scenario-instance-id";

export interface ScenarioUpParams {
    type: "run" | "generation";
    entityId: string;
}

export interface ScenarioUpDeps {
    db: PrismaClient;
    manager: ScenarioManager;
}

export async function scenarioUp(params: ScenarioUpParams, deps: ScenarioUpDeps): Promise<void> {
    const { type, entityId } = params;
    const { db, manager } = deps;

    const subject = createSubject(type, db, entityId);
    const { scenarioId, snapshotId } = await resolveScenarioContext(type, db, entityId);
    const instance = await manager.up(subject, scenarioId, { snapshotId });

    if (instance.status === "UP_FAILED") {
        throw new Error(
            `Scenario up failed: instanceId=${instance.id}, lastError=${JSON.stringify(instance.lastError)}`,
        );
    }

    await writeFile(INSTANCE_ID_OUTPUT_PATH, instance.id, "utf-8");
}

function createSubject(type: "run" | "generation", db: PrismaClient, entityId: string): ScenarioSubject {
    if (type === "generation") return new GenerationSubject(db, entityId);
    return new RunSubject(db, entityId);
}

async function resolveScenarioContext(
    type: "run" | "generation",
    db: PrismaClient,
    entityId: string,
): Promise<{ scenarioId: string; snapshotId: string }> {
    if (type === "generation") {
        const generation = await db.testGeneration.findUniqueOrThrow({
            where: { id: entityId },
            select: {
                snapshotId: true,
                testPlan: { select: { scenarioId: true } },
            },
        });
        const scenarioId = generation.testPlan.scenarioId;
        if (scenarioId == null) {
            throw new Error(`Generation ${entityId} has no linked scenario`);
        }
        if (generation.snapshotId == null) {
            throw new Error(`Generation ${entityId} has no linked snapshot`);
        }
        return { scenarioId, snapshotId: generation.snapshotId };
    }

    const run = await db.run.findUniqueOrThrow({
        where: { id: entityId },
        select: {
            assignment: {
                select: {
                    snapshotId: true,
                    plan: {
                        select: { scenarioId: true },
                    },
                },
            },
        },
    });
    const scenarioId = run.assignment.plan?.scenarioId;
    if (scenarioId == null) {
        throw new Error(`Run ${entityId} has no linked scenario`);
    }
    return { scenarioId, snapshotId: run.assignment.snapshotId };
}
