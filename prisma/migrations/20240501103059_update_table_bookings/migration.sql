/*
  Warnings:

  - Added the required column `is_paid` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "is_paid" BOOLEAN NOT NULL;
