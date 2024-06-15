-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_voucher_id_fkey";

-- AlterTable
ALTER TABLE "Booking" ALTER COLUMN "voucher_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "Voucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
