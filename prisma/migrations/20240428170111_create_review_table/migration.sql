-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "Services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
