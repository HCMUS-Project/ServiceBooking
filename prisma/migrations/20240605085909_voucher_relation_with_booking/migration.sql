-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "Voucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
