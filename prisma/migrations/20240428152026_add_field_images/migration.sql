-- AlterTable
ALTER TABLE "Services" ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[];
