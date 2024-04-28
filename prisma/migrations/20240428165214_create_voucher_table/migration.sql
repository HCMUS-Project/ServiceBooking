-- CreateTable
CREATE TABLE "Voucher" (
    "id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "voucher_name" TEXT NOT NULL,
    "voucher_code" TEXT NOT NULL,
    "max_discount_value" DOUBLE PRECISION NOT NULL,
    "min_app_value" DOUBLE PRECISION NOT NULL,
    "discount_percent" DOUBLE PRECISION NOT NULL,
    "expired_time" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Voucher_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "Services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
