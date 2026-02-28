-- CreateTable
CREATE TABLE "billing_records" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "invoice_amount_paise" BIGINT NOT NULL,
    "invoice_date" TIMESTAMP(3) NOT NULL,
    "project_type" TEXT NOT NULL,
    "vertical" TEXT NOT NULL,
    "period_month" INTEGER NOT NULL,
    "period_year" INTEGER NOT NULL,
    "upload_event_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "billing_records_period_idx" ON "billing_records"("period_month", "period_year");

-- CreateIndex
CREATE INDEX "billing_records_project_id_idx" ON "billing_records"("project_id");

-- AddForeignKey
ALTER TABLE "billing_records" ADD CONSTRAINT "billing_records_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_records" ADD CONSTRAINT "billing_records_upload_event_id_fkey" FOREIGN KEY ("upload_event_id") REFERENCES "upload_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
