-- Drop the previous normalized recipe storage tables.
DROP TABLE "scenario_recipe_node";
DROP TABLE "scenario_recipe_version" CASCADE;
DROP TABLE "scenario_recipe_upload" CASCADE;

-- Remove node-only enum types.
DROP TYPE "scenario_recipe_node_root_kind";
DROP TYPE "scenario_recipe_node_type";

-- CreateTable
CREATE TABLE "scenario_schema" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scenario_schema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scenario_schema_snapshot" (
    "id" TEXT NOT NULL,
    "schema_id" TEXT NOT NULL,
    "snapshot_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "structure_json" JSONB NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scenario_schema_snapshot_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "scenario"
ADD COLUMN "schema_id" TEXT;

-- Existing uploaded scenarios are intentionally discarded. New uploads recreate
-- scenario versions under the schema/fixture split.
UPDATE "scenario"
SET "active_recipe_version_id" = NULL,
    "schema_id" = NULL,
    "is_disabled" = true;

-- CreateTable
CREATE TABLE "scenario_recipe_version" (
    "id" TEXT NOT NULL,
    "scenario_id" TEXT NOT NULL,
    "schema_snapshot_id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "scenario_name_snapshot" TEXT NOT NULL,
    "description" TEXT,
    "fingerprint" TEXT NOT NULL,
    "validation_status" TEXT NOT NULL,
    "validation_method" TEXT NOT NULL,
    "validation_phase" TEXT NOT NULL,
    "validation_up_ms" INTEGER,
    "validation_down_ms" INTEGER,
    "fixture_json" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "activated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "superseded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scenario_recipe_version_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scenario_schema_application_id_key" ON "scenario_schema"("application_id");

-- CreateIndex
CREATE UNIQUE INDEX "scenario_schema_snapshot_schema_id_version_key" ON "scenario_schema_snapshot"("schema_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "scenario_schema_snapshot_schema_id_fingerprint_key" ON "scenario_schema_snapshot"("schema_id", "fingerprint");

-- CreateIndex
CREATE INDEX "scenario_schema_snapshot_schema_id_idx" ON "scenario_schema_snapshot"("schema_id");

-- CreateIndex
CREATE INDEX "scenario_schema_snapshot_snapshot_id_idx" ON "scenario_schema_snapshot"("snapshot_id");

-- CreateIndex
CREATE INDEX "scenario_schema_id_idx" ON "scenario"("schema_id");

-- CreateIndex
CREATE INDEX "scenario_recipe_version_schema_snapshot_id_idx" ON "scenario_recipe_version"("schema_snapshot_id");

-- CreateIndex
CREATE INDEX "scenario_recipe_version_scenario_id_idx" ON "scenario_recipe_version"("scenario_id");

-- CreateIndex
CREATE INDEX "scenario_recipe_version_application_id_idx" ON "scenario_recipe_version"("application_id");

-- CreateIndex
CREATE INDEX "scenario_recipe_version_organization_id_idx" ON "scenario_recipe_version"("organization_id");

-- CreateIndex
CREATE INDEX "scenario_recipe_version_scenario_id_is_active_idx" ON "scenario_recipe_version"("scenario_id", "is_active");

-- AddForeignKey
ALTER TABLE "scenario_schema"
ADD CONSTRAINT "scenario_schema_application_id_fkey"
FOREIGN KEY ("application_id") REFERENCES "application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario_schema"
ADD CONSTRAINT "scenario_schema_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario_schema_snapshot"
ADD CONSTRAINT "scenario_schema_snapshot_schema_id_fkey"
FOREIGN KEY ("schema_id") REFERENCES "scenario_schema"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario_schema_snapshot"
ADD CONSTRAINT "scenario_schema_snapshot_snapshot_id_fkey"
FOREIGN KEY ("snapshot_id") REFERENCES "branch_snapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario"
ADD CONSTRAINT "scenario_schema_id_fkey"
FOREIGN KEY ("schema_id") REFERENCES "scenario_schema"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario"
ADD CONSTRAINT "scenario_active_recipe_version_id_fkey"
FOREIGN KEY ("active_recipe_version_id") REFERENCES "scenario_recipe_version"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario_recipe_version"
ADD CONSTRAINT "scenario_recipe_version_scenario_id_fkey"
FOREIGN KEY ("scenario_id") REFERENCES "scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario_recipe_version"
ADD CONSTRAINT "scenario_recipe_version_schema_snapshot_id_fkey"
FOREIGN KEY ("schema_snapshot_id") REFERENCES "scenario_schema_snapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario_recipe_version"
ADD CONSTRAINT "scenario_recipe_version_application_id_fkey"
FOREIGN KEY ("application_id") REFERENCES "application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario_recipe_version"
ADD CONSTRAINT "scenario_recipe_version_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
