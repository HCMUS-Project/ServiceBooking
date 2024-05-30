-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_service_id_fkey";

-- DropForeignKey
ALTER TABLE "EmployeeService" DROP CONSTRAINT "EmployeeService_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "EmployeeService" DROP CONSTRAINT "EmployeeService_service_id_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_service_id_fkey";

-- DropForeignKey
ALTER TABLE "ServiceTime" DROP CONSTRAINT "ServiceTime_service_id_fkey";

-- DropForeignKey
ALTER TABLE "Voucher" DROP CONSTRAINT "Voucher_service_id_fkey";

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "Services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeService" ADD CONSTRAINT "EmployeeService_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeService" ADD CONSTRAINT "EmployeeService_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "Services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "Services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceTime" ADD CONSTRAINT "ServiceTime_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "Services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "Services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
