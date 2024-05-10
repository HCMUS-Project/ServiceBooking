/*
  Warnings:

  - You are about to drop the column `name` on the `Employee` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "name",
ADD COLUMN     "email" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "first_name" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "last_name" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'booking';

-- AlterTable
ALTER TABLE "Voucher" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'booking';
