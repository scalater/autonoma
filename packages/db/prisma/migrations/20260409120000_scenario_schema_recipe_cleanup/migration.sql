-- Scenario schema and recipe versioning cleanup.
-- Removes ScenarioSchema, reshapes ScenarioSchemaSnapshot to (applicationId, snapshotId),
-- adds snapshotId to ScenarioRecipeVersion, removes isActive/activatedAt/supersededAt,
-- removes RUNNING_TESTS from ScenarioInstanceStatus, removes schemaId from Scenario.
--
-- This migration is written idempotently (IF NOT EXISTS / IF EXISTS) so it can
-- safely re-run against a database where an earlier attempt partially applied.

-- ============================================================================
-- 1. Migrate RUNNING_TESTS instances to UP_SUCCESS before dropping the enum value
-- ============================================================================
UPDATE "scenario_instance"
SET "status" = 'UP_SUCCESS'
WHERE "status" = 'RUNNING_TESTS';

-- ============================================================================
-- 2. Add snapshot_id to scenario_recipe_version (backfill from schema snapshot)
-- ============================================================================
ALTER TABLE "scenario_recipe_version"
ADD COLUMN IF NOT EXISTS "snapshot_id" TEXT;

UPDATE "scenario_recipe_version" srv
SET "snapshot_id" = sss."snapshot_id"
FROM "scenario_schema_snapshot" sss
WHERE srv."schema_snapshot_id" = sss."id"
  AND srv."snapshot_id" IS NULL;

-- Delete orphaned recipe versions that have no valid schema snapshot
DELETE FROM "scenario_recipe_version"
WHERE "snapshot_id" IS NULL;

ALTER TABLE "scenario_recipe_version"
ALTER COLUMN "snapshot_id" SET NOT NULL;

-- ============================================================================
-- 3. Reshape scenario_schema_snapshot: add application_id, drop schema_id
-- ============================================================================
ALTER TABLE "scenario_schema_snapshot"
ADD COLUMN IF NOT EXISTS "application_id" TEXT;

-- Backfill application_id from scenario_schema. Wrapped in a DO block because
-- schema_id may already have been dropped by a prior partial run.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'scenario_schema_snapshot' AND column_name = 'schema_id'
    ) THEN
        UPDATE "scenario_schema_snapshot" sss
        SET "application_id" = ss."application_id"
        FROM "scenario_schema" ss
        WHERE sss."schema_id" = ss."id"
          AND sss."application_id" IS NULL;
    END IF;
END $$;

-- Delete orphaned snapshots that have no valid schema
DELETE FROM "scenario_schema_snapshot"
WHERE "application_id" IS NULL;

ALTER TABLE "scenario_schema_snapshot"
ALTER COLUMN "application_id" SET NOT NULL;

-- Drop old constraints and indexes on scenario_schema_snapshot
DROP INDEX IF EXISTS "scenario_schema_snapshot_schema_id_version_key";
DROP INDEX IF EXISTS "scenario_schema_snapshot_schema_id_fingerprint_key";
DROP INDEX IF EXISTS "scenario_schema_snapshot_schema_id_idx";

ALTER TABLE "scenario_schema_snapshot"
DROP CONSTRAINT IF EXISTS "scenario_schema_snapshot_schema_id_fkey";

ALTER TABLE "scenario_schema_snapshot"
DROP COLUMN IF EXISTS "schema_id",
DROP COLUMN IF EXISTS "version";

-- Deduplicate rows before adding unique constraint: keep one row per (application_id, snapshot_id).
-- First, reassign recipe versions that reference a duplicate snapshot to the survivor.
UPDATE "scenario_recipe_version" srv
SET "schema_snapshot_id" = keeper.id
FROM "scenario_schema_snapshot" dup
JOIN LATERAL (
  SELECT s.id FROM "scenario_schema_snapshot" s
  WHERE s."application_id" = dup."application_id"
    AND s."snapshot_id" = dup."snapshot_id"
  ORDER BY s."created_at" DESC, s."id" DESC
  LIMIT 1
) keeper ON true
WHERE srv."schema_snapshot_id" = dup."id"
  AND dup."id" <> keeper.id;

-- Now delete the duplicate rows (keep the latest per group)
DELETE FROM "scenario_schema_snapshot"
WHERE "id" NOT IN (
  SELECT DISTINCT ON ("application_id", "snapshot_id") "id"
  FROM "scenario_schema_snapshot"
  ORDER BY "application_id", "snapshot_id", "created_at" DESC, "id" DESC
);

-- Add new constraints for (applicationId, snapshotId) scoping
CREATE UNIQUE INDEX IF NOT EXISTS "scenario_schema_snapshot_application_id_snapshot_id_key"
ON "scenario_schema_snapshot"("application_id", "snapshot_id");

CREATE INDEX IF NOT EXISTS "scenario_schema_snapshot_application_id_idx"
ON "scenario_schema_snapshot"("application_id");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scenario_schema_snapshot_application_id_fkey') THEN
        ALTER TABLE "scenario_schema_snapshot"
        ADD CONSTRAINT "scenario_schema_snapshot_application_id_fkey"
        FOREIGN KEY ("application_id") REFERENCES "application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================================================
-- 4. Remove schemaId from scenario
-- ============================================================================
DROP INDEX IF EXISTS "scenario_schema_id_idx";

ALTER TABLE "scenario"
DROP CONSTRAINT IF EXISTS "scenario_schema_id_fkey";

ALTER TABLE "scenario"
DROP COLUMN IF EXISTS "schema_id";

-- ============================================================================
-- 5. Drop scenario_schema table
-- ============================================================================
DROP TABLE IF EXISTS "scenario_schema";

-- ============================================================================
-- 6. Remove isActive, activatedAt, supersededAt from scenario_recipe_version
-- ============================================================================
DROP INDEX IF EXISTS "scenario_recipe_version_scenario_id_is_active_idx";

ALTER TABLE "scenario_recipe_version"
DROP COLUMN IF EXISTS "is_active",
DROP COLUMN IF EXISTS "activated_at",
DROP COLUMN IF EXISTS "superseded_at";

-- ============================================================================
-- 7. Add unique constraint and FK for (scenarioId, snapshotId) on recipe version
-- ============================================================================

-- Deduplicate recipe versions before adding unique constraint.
-- Reassign scenario.active_recipe_version_id from duplicates to the survivor.
UPDATE "scenario" s
SET "active_recipe_version_id" = keeper.id
FROM "scenario_recipe_version" dup
JOIN LATERAL (
  SELECT rv.id FROM "scenario_recipe_version" rv
  WHERE rv."scenario_id" = dup."scenario_id"
    AND rv."snapshot_id" = dup."snapshot_id"
  ORDER BY rv."created_at" DESC, rv."id" DESC
  LIMIT 1
) keeper ON true
WHERE s."active_recipe_version_id" = dup."id"
  AND dup."id" <> keeper.id;

-- Delete duplicate recipe versions (keep the latest per group)
DELETE FROM "scenario_recipe_version"
WHERE "id" NOT IN (
  SELECT DISTINCT ON ("scenario_id", "snapshot_id") "id"
  FROM "scenario_recipe_version"
  ORDER BY "scenario_id", "snapshot_id", "created_at" DESC, "id" DESC
);

CREATE UNIQUE INDEX IF NOT EXISTS "scenario_recipe_version_scenario_id_snapshot_id_key"
ON "scenario_recipe_version"("scenario_id", "snapshot_id");

CREATE INDEX IF NOT EXISTS "scenario_recipe_version_snapshot_id_idx"
ON "scenario_recipe_version"("snapshot_id");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scenario_recipe_version_snapshot_id_fkey') THEN
        ALTER TABLE "scenario_recipe_version"
        ADD CONSTRAINT "scenario_recipe_version_snapshot_id_fkey"
        FOREIGN KEY ("snapshot_id") REFERENCES "branch_snapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================================================
-- 8. Remove RUNNING_TESTS from scenario_instance_status enum
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'RUNNING_TESTS' AND enumtypid = 'scenario_instance_status'::regtype) THEN
        ALTER TABLE "scenario_instance" ALTER COLUMN "status" DROP DEFAULT;

        ALTER TYPE "scenario_instance_status" RENAME TO "scenario_instance_status_old";
        CREATE TYPE "scenario_instance_status" AS ENUM ('REQUESTED', 'UP_SUCCESS', 'UP_FAILED', 'DOWN_SUCCESS', 'DOWN_FAILED');
        ALTER TABLE "scenario_instance" ALTER COLUMN "status" TYPE "scenario_instance_status" USING ("status"::text::"scenario_instance_status");
        DROP TYPE "scenario_instance_status_old";

        ALTER TABLE "scenario_instance" ALTER COLUMN "status" SET DEFAULT 'REQUESTED'::"scenario_instance_status";
    END IF;
END $$;
