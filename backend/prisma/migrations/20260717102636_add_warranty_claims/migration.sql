-- CreateEnum
CREATE TYPE "WarrantyStatus" AS ENUM ('CLAIM_RECEIVED', 'UNDER_REVIEW', 'ADDITIONAL_INFO_REQUIRED', 'APPROVED', 'REJECTED', 'PICKUP_SCHEDULED', 'PRODUCT_RECEIVED', 'REPAIR_IN_PROGRESS', 'REPLACEMENT_APPROVED', 'REPLACEMENT_SHIPPED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "AttachmentType" AS ENUM ('INVOICE', 'WARRANTY_CARD', 'PRODUCT_IMAGE', 'PRODUCT_VIDEO');

-- CreateTable
CREATE TABLE "WarrantyClaim" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "userId" TEXT,
    "fullName" TEXT NOT NULL,
    "mobileNumber" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productModel" TEXT NOT NULL,
    "orderId" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "status" "WarrantyStatus" NOT NULL DEFAULT 'CLAIM_RECEIVED',
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarrantyClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarrantyAttachment" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "type" "AttachmentType" NOT NULL,
    "url" TEXT NOT NULL,
    "originalName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WarrantyAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarrantyStatusHistory" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "status" "WarrantyStatus" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WarrantyStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WarrantyClaim_claimId_key" ON "WarrantyClaim"("claimId");

-- AddForeignKey
ALTER TABLE "WarrantyClaim" ADD CONSTRAINT "WarrantyClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarrantyAttachment" ADD CONSTRAINT "WarrantyAttachment_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "WarrantyClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarrantyStatusHistory" ADD CONSTRAINT "WarrantyStatusHistory_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "WarrantyClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
