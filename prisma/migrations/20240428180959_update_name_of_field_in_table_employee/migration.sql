/*
  Warnings:

  - You are about to drop the column `workDays` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `workTime` on the `Employee` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "workDays",
DROP COLUMN "workTime",
ADD COLUMN     "work_days" TEXT[],
ADD COLUMN     "work_shift" TEXT[];
