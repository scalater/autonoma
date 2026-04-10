-- CreateTable
CREATE TABLE "application_setup_artifact" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "setup_id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_setup_artifact_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "scenario" ADD COLUMN "recipe" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "application_setup_artifact_setup_id_path_key" ON "application_setup_artifact"("setup_id", "path");

-- CreateIndex
CREATE INDEX "application_setup_artifact_setup_id_idx" ON "application_setup_artifact"("setup_id");

-- CreateIndex
CREATE INDEX "application_setup_artifact_application_id_idx" ON "application_setup_artifact"("application_id");

-- AddForeignKey
ALTER TABLE "application_setup_artifact"
ADD CONSTRAINT "application_setup_artifact_setup_id_fkey"
FOREIGN KEY ("setup_id") REFERENCES "application_setup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_setup_artifact"
ADD CONSTRAINT "application_setup_artifact_application_id_fkey"
FOREIGN KEY ("application_id") REFERENCES "application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_setup_artifact"
ADD CONSTRAINT "application_setup_artifact_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
