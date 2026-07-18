/*
  Warnings:

  - Added the required column `purchasedFrom` to the `WarrantyClaim` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PurchasePlatform" AS ENUM ('AMAZON', 'FLIPKART', 'OFFICIAL_WEBSITE', 'MYNTRA', 'OFFLINE');

-- AlterTable
ALTER TABLE "WarrantyClaim" ADD COLUMN     "purchasedFrom" "PurchasePlatform" NOT NULL;
