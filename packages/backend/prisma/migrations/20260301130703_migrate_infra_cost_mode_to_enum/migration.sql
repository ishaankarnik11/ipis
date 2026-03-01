-- CreateEnum
CREATE TYPE "InfraCostMode" AS ENUM ('SIMPLE', 'DETAILED');

-- AlterTable: convert existing text values to enum in-place (preserves data)
ALTER TABLE "projects"
  ALTER COLUMN "infra_cost_mode" TYPE "InfraCostMode"
  USING "infra_cost_mode"::"InfraCostMode";
