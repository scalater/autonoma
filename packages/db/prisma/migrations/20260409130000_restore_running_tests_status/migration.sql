-- Restore RUNNING_TESTS to scenario_instance_status enum.
-- The previous migration removed it prematurely; it is still needed by the engine.

ALTER TABLE "scenario_instance" ALTER COLUMN "status" DROP DEFAULT;

ALTER TYPE "scenario_instance_status" RENAME TO "scenario_instance_status_old";
CREATE TYPE "scenario_instance_status" AS ENUM ('REQUESTED', 'UP_SUCCESS', 'UP_FAILED', 'RUNNING_TESTS', 'DOWN_SUCCESS', 'DOWN_FAILED');
ALTER TABLE "scenario_instance" ALTER COLUMN "status" TYPE "scenario_instance_status" USING ("status"::text::"scenario_instance_status");
DROP TYPE "scenario_instance_status_old";

ALTER TABLE "scenario_instance" ALTER COLUMN "status" SET DEFAULT 'REQUESTED'::"scenario_instance_status";
