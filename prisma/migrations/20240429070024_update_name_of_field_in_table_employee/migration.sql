/*
  Warnings:

  - The primary key for the `EmployeeService` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `employeeId` on the `EmployeeService` table. All the data in the column will be lost.
  - You are about to drop the column `serviceId` on the `EmployeeService` table. All the data in the column will be lost.
  - Added the required column `employee_id` to the `EmployeeService` table without a default value. This is not possible if the table is not empty.
  - Added the required column `service_id` to the `EmployeeService` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "EmployeeService" DROP CONSTRAINT "EmployeeService_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "EmployeeService" DROP CONSTRAINT "EmployeeService_serviceId_fkey";

-- AlterTable
ALTER TABLE "EmployeeService" DROP CONSTRAINT "EmployeeService_pkey",
DROP COLUMN "employeeId",
DROP COLUMN "serviceId",
ADD COLUMN     "employee_id" TEXT NOT NULL,
ADD COLUMN     "service_id" TEXT NOT NULL,
ADD CONSTRAINT "EmployeeService_pkey" PRIMARY KEY ("employee_id", "service_id");

-- AddForeignKey
ALTER TABLE "EmployeeService" ADD CONSTRAINT "EmployeeService_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeService" ADD CONSTRAINT "EmployeeService_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "Services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
