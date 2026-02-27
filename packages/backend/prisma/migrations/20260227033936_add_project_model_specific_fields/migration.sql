-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "budget_paise" BIGINT,
ADD COLUMN     "infra_cost_mode" TEXT,
ADD COLUMN     "manpower_cost_paise" BIGINT,
ADD COLUMN     "sla_description" TEXT,
ADD COLUMN     "vendor_cost_paise" BIGINT;
