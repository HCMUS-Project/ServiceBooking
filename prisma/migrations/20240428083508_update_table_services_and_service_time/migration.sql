/*
  Warnings:

  - You are about to drop the column `servicesId` on the `ServiceTime` table. All the data in the column will be lost.
  - You are about to drop the column `serviceTimeId` on the `Services` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ServiceTime" DROP COLUMN "servicesId";

-- AlterTable
ALTER TABLE "Services" DROP COLUMN "serviceTimeId";
