/*
  Warnings:

  - You are about to drop the column `description` on the `Review` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `Review` table. All the data in the column will be lost.
  - You are about to alter the column `rating` on the `Review` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(19,1)`.
  - Added the required column `domain` to the `Review` table without a default value. This is not possible if the table is not empty.
  - Added the required column `review` to the `Review` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user` to the `Review` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Review" DROP COLUMN "description",
DROP COLUMN "user_id",
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "domain" TEXT NOT NULL,
ADD COLUMN     "review" TEXT NOT NULL,
ADD COLUMN     "user" TEXT NOT NULL,
ALTER COLUMN "rating" SET DATA TYPE DECIMAL(19,1);
