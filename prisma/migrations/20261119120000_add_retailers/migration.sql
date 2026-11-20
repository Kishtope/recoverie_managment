-- AlterTable
ALTER TABLE `Customer` ADD COLUMN `retailerAssignedOn` DATETIME(3) NULL,
    ADD COLUMN `retailerId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `ImportRun` ADD COLUMN `retailerSummary` JSON NULL;

-- CreateTable
CREATE TABLE `Retailer` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `ownerName` VARCHAR(191) NOT NULL,
    `mobile` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `address` TEXT NULL,
    `city` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Retailer_code_key`(`code`),
    INDEX `Retailer_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Customer_retailerId_idx` ON `Customer`(`retailerId`);

-- AddForeignKey
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_retailerId_fkey` FOREIGN KEY (`retailerId`) REFERENCES `Retailer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

