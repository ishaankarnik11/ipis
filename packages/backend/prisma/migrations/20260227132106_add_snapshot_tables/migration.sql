-- CreateTable
CREATE TABLE "recalculation_runs" (
    "id" TEXT NOT NULL,
    "upload_event_id" TEXT NOT NULL,
    "projects_processed" INTEGER NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recalculation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calculation_snapshots" (
    "id" TEXT NOT NULL,
    "recalculation_run_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "figure_type" TEXT NOT NULL,
    "period_month" INTEGER NOT NULL,
    "period_year" INTEGER NOT NULL,
    "value_paise" BIGINT NOT NULL,
    "breakdown_json" JSONB NOT NULL,
    "engine_version" TEXT NOT NULL,
    "calculated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calculation_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "snapshots_entity_period_idx" ON "calculation_snapshots"("entity_type", "entity_id", "period_month", "period_year");

-- CreateIndex
CREATE INDEX "snapshots_run_id_idx" ON "calculation_snapshots"("recalculation_run_id");

-- AddForeignKey
ALTER TABLE "calculation_snapshots" ADD CONSTRAINT "calculation_snapshots_recalculation_run_id_fkey" FOREIGN KEY ("recalculation_run_id") REFERENCES "recalculation_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
