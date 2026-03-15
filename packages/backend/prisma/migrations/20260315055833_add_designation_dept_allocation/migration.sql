-- AlterTable
ALTER TABLE "departments" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "employee_projects" ADD COLUMN     "allocation_percent" INTEGER NOT NULL DEFAULT 100;

-- AlterTable
ALTER TABLE "project_roles" ADD COLUMN     "department_id" TEXT;

-- AlterTable
ALTER TABLE "system_config" ADD COLUMN     "annual_overhead_per_employee" BIGINT NOT NULL DEFAULT 18000000;

-- AddForeignKey
ALTER TABLE "project_roles" ADD CONSTRAINT "project_roles_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
