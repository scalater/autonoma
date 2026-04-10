-- CreateEnum
CREATE TYPE "scenario_recipe_node_type" AS ENUM ('OBJECT', 'ARRAY', 'STRING', 'NUMBER', 'BOOLEAN', 'NULL');

-- CreateEnum
CREATE TYPE "scenario_recipe_node_root_kind" AS ENUM (
    'CREATE',
    'UPLOAD_EXTRA',
    'SOURCE_EXTRA',
    'RECIPE_EXTRA',
    'VALIDATION_EXTRA'
);

-- AlterTable
ALTER TABLE "scenario" ADD COLUMN "active_recipe_version_id" TEXT;

-- Drop legacy alpha-only JSON recipe storage. Existing data does not need preservation.
ALTER TABLE "scenario" DROP COLUMN "recipe";

-- Remove legacy raw scenario recipe artifacts. New uploads must use the normalized recipe endpoint.
DELETE FROM "application_setup_artifact" WHERE "path" = 'autonoma/scenario-recipes.json';

-- CreateTable
CREATE TABLE "scenario_recipe_upload" (
    "id" TEXT NOT NULL,
    "setup_id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "file_version" INTEGER NOT NULL,
    "validation_mode" TEXT NOT NULL,
    "discover_path" TEXT NOT NULL,
    "scenarios_path" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "superseded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scenario_recipe_upload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scenario_recipe_version" (
    "id" TEXT NOT NULL,
    "scenario_id" TEXT NOT NULL,
    "upload_id" TEXT NOT NULL,
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
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "activated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "superseded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scenario_recipe_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scenario_recipe_node" (
    "id" TEXT NOT NULL,
    "upload_id" TEXT,
    "recipe_version_id" TEXT,
    "parent_node_id" TEXT,
    "root_kind" "scenario_recipe_node_root_kind" NOT NULL,
    "node_type" "scenario_recipe_node_type" NOT NULL,
    "property_key" TEXT,
    "array_index" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "string_value" TEXT,
    "number_value" TEXT,
    "boolean_value" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scenario_recipe_node_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scenario_active_recipe_version_id_key" ON "scenario"("active_recipe_version_id");

-- CreateIndex
CREATE INDEX "scenario_recipe_upload_setup_id_idx" ON "scenario_recipe_upload"("setup_id");

-- CreateIndex
CREATE INDEX "scenario_recipe_upload_application_id_idx" ON "scenario_recipe_upload"("application_id");

-- CreateIndex
CREATE INDEX "scenario_recipe_upload_organization_id_idx" ON "scenario_recipe_upload"("organization_id");

-- CreateIndex
CREATE INDEX "scenario_recipe_upload_application_id_is_active_idx" ON "scenario_recipe_upload"("application_id", "is_active");

-- CreateIndex
CREATE INDEX "scenario_recipe_version_scenario_id_idx" ON "scenario_recipe_version"("scenario_id");

-- CreateIndex
CREATE INDEX "scenario_recipe_version_upload_id_idx" ON "scenario_recipe_version"("upload_id");

-- CreateIndex
CREATE INDEX "scenario_recipe_version_application_id_idx" ON "scenario_recipe_version"("application_id");

-- CreateIndex
CREATE INDEX "scenario_recipe_version_organization_id_idx" ON "scenario_recipe_version"("organization_id");

-- CreateIndex
CREATE INDEX "scenario_recipe_version_scenario_id_is_active_idx" ON "scenario_recipe_version"("scenario_id", "is_active");

-- CreateIndex
CREATE INDEX "scenario_recipe_node_upload_id_idx" ON "scenario_recipe_node"("upload_id");

-- CreateIndex
CREATE INDEX "scenario_recipe_node_recipe_version_id_idx" ON "scenario_recipe_node"("recipe_version_id");

-- CreateIndex
CREATE INDEX "scenario_recipe_node_parent_node_id_idx" ON "scenario_recipe_node"("parent_node_id");

-- CreateIndex
CREATE INDEX "scenario_recipe_node_recipe_version_id_root_kind_idx" ON "scenario_recipe_node"("recipe_version_id", "root_kind");

-- CreateIndex
CREATE INDEX "scenario_recipe_node_upload_id_root_kind_idx" ON "scenario_recipe_node"("upload_id", "root_kind");

-- CreateIndex
CREATE INDEX "scenario_recipe_node_parent_node_id_sort_order_idx" ON "scenario_recipe_node"("parent_node_id", "sort_order");

-- AddForeignKey
ALTER TABLE "scenario"
ADD CONSTRAINT "scenario_active_recipe_version_id_fkey"
FOREIGN KEY ("active_recipe_version_id") REFERENCES "scenario_recipe_version"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario_recipe_upload"
ADD CONSTRAINT "scenario_recipe_upload_setup_id_fkey"
FOREIGN KEY ("setup_id") REFERENCES "application_setup"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario_recipe_upload"
ADD CONSTRAINT "scenario_recipe_upload_application_id_fkey"
FOREIGN KEY ("application_id") REFERENCES "application"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario_recipe_upload"
ADD CONSTRAINT "scenario_recipe_upload_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES "organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario_recipe_version"
ADD CONSTRAINT "scenario_recipe_version_scenario_id_fkey"
FOREIGN KEY ("scenario_id") REFERENCES "scenario"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario_recipe_version"
ADD CONSTRAINT "scenario_recipe_version_upload_id_fkey"
FOREIGN KEY ("upload_id") REFERENCES "scenario_recipe_upload"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario_recipe_version"
ADD CONSTRAINT "scenario_recipe_version_application_id_fkey"
FOREIGN KEY ("application_id") REFERENCES "application"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario_recipe_version"
ADD CONSTRAINT "scenario_recipe_version_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES "organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario_recipe_node"
ADD CONSTRAINT "scenario_recipe_node_upload_id_fkey"
FOREIGN KEY ("upload_id") REFERENCES "scenario_recipe_upload"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario_recipe_node"
ADD CONSTRAINT "scenario_recipe_node_recipe_version_id_fkey"
FOREIGN KEY ("recipe_version_id") REFERENCES "scenario_recipe_version"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario_recipe_node"
ADD CONSTRAINT "scenario_recipe_node_parent_node_id_fkey"
FOREIGN KEY ("parent_node_id") REFERENCES "scenario_recipe_node"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
