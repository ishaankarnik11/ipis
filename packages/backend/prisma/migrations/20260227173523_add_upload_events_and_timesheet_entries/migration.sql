-- CreateEnum
CREATE TYPE "UploadType" AS ENUM ('TIMESHEET', 'BILLING', 'SALARY');

-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('SUCCESS', 'FAILED', 'PARTIAL');

-- CreateTable
CREATE TABLE "upload_events" (
    "id" TEXT NOT NULL,
    "type" "UploadType" NOT NULL,
    "status" "UploadStatus" NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "period_month" INTEGER NOT NULL,
    "period_year" INTEGER NOT NULL,
    "row_count" INTEGER NOT NULL,
    "replaced_rows_count" INTEGER,
    "error_summary" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upload_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timesheet_entries" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "period_month" INTEGER NOT NULL,
    "period_year" INTEGER NOT NULL,
    "upload_event_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timesheet_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "timesheets_period_idx" ON "timesheet_entries"("period_month", "period_year");

-- CreateIndex
CREATE INDEX "timesheets_project_id_idx" ON "timesheet_entries"("project_id");

-- AddForeignKey
ALTER TABLE "upload_events" ADD CONSTRAINT "upload_events_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timesheet_entries" ADD CONSTRAINT "timesheet_entries_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timesheet_entries" ADD CONSTRAINT "timesheet_entries_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timesheet_entries" ADD CONSTRAINT "timesheet_entries_upload_event_id_fkey" FOREIGN KEY ("upload_event_id") REFERENCES "upload_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
