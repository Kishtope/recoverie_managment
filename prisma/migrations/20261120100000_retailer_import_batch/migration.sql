-- AlterTable: the upload (import run) that gave the customer to its retailer, so every assignment is traceable to a batch
ALTER TABLE `Customer` ADD COLUMN `retailerImportId` VARCHAR(191) NULL;
