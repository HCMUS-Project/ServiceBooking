/*
  Warnings:

  - You are about to drop the column `expired_time` on the `Voucher` table. All the data in the column will be lost.
  - You are about to drop the column `max_discount_value` on the `Voucher` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "total_price" DECIMAL(19,2) NOT NULL DEFAULT 0,
ADD COLUMN     "voucher_id" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Services" ADD COLUMN     "number_rating" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Voucher" DROP COLUMN "expired_time",
DROP COLUMN "max_discount_value",
ADD COLUMN     "expire_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "max_discount" DOUBLE PRECISION NOT NULL DEFAULT 0;
