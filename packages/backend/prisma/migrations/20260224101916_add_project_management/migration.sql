-- CreateEnum
CREATE TYPE "EngagementModel" AS ENUM ('TIME_AND_MATERIALS', 'FIXED_COST', 'AMC', 'INFRASTRUCTURE');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PENDING_APPROVAL', 'ACTIVE', 'REJECTED', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "client" TEXT NOT NULL,
    "vertical" TEXT NOT NULL,
    "engagement_model" "EngagementModel" NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "contract_value_paise" BIGINT,
    "delivery_manager_id" TEXT NOT NULL,
    "rejection_comment" TEXT,
    "completion_percent" DECIMAL(65,30),
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_delivery_manager_id_fkey" FOREIGN KEY ("delivery_manager_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
