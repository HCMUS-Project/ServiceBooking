/*
  Warnings:

  - You are about to drop the column `is_paid` on the `Booking` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "is_paid",
ADD COLUMN     "note_cancel" TEXT;
