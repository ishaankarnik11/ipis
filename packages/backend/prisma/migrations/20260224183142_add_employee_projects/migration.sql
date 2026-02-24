-- CreateTable
CREATE TABLE "employee_projects" (
    "project_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "billing_rate_paise" BIGINT,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_projects_pkey" PRIMARY KEY ("project_id","employee_id")
);

-- AddForeignKey
ALTER TABLE "employee_projects" ADD CONSTRAINT "employee_projects_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_projects" ADD CONSTRAINT "employee_projects_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
