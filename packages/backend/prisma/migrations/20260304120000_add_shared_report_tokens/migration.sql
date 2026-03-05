-- CreateTable
CREATE TABLE "shared_report_tokens" (
    "id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "report_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "period_month" INTEGER NOT NULL,
    "period_year" INTEGER NOT NULL,
    "snapshot_data" JSONB NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shared_report_tokens_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "shared_report_tokens" ADD CONSTRAINT "shared_report_tokens_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
