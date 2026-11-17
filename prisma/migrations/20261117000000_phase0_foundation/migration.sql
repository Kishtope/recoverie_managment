-- Data step: old free-text roles become the new enum values ("admin" -> ADMIN, everything else -> AGENT).
UPDATE `User` SET `role` = CASE WHEN LOWER(`role`) = 'admin' THEN 'ADMIN' ELSE 'AGENT' END;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `agencyId` VARCHAR(191) NULL,
    ADD COLUMN `hubUserId` VARCHAR(191) NULL,
    ADD COLUMN `lastLoginAt` DATETIME(3) NULL,
    ADD COLUMN `mobile` VARCHAR(191) NULL,
    ADD COLUMN `reportsToId` VARCHAR(191) NULL,
    ADD COLUMN `status` ENUM('ACTIVE', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
    MODIFY `email` VARCHAR(191) NULL,
    MODIFY `role` ENUM('ADMIN', 'MANAGER', 'AGENCY_OWNER', 'AGENT', 'FIELD_AGENT') NOT NULL DEFAULT 'AGENT';

-- CreateTable
CREATE TABLE `UserAccess` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `company` ENUM('AF', 'BLD', 'MF', 'MMPL') NOT NULL,
    `branch` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `UserAccess_userId_company_branch_key`(`userId`, `company`, `branch`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Agency` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `ownerUserId` VARCHAR(191) NULL,
    `commissionPct` DECIMAL(5, 2) NULL,

    UNIQUE INDEX `Agency_name_key`(`name`),
    UNIQUE INDEX `Agency_ownerUserId_key`(`ownerUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `entity` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NULL,
    `meta` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_entity_entityId_idx`(`entity`, `entityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `User_mobile_key` ON `User`(`mobile`);

-- CreateIndex
CREATE UNIQUE INDEX `User_hubUserId_key` ON `User`(`hubUserId`);

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_agencyId_fkey` FOREIGN KEY (`agencyId`) REFERENCES `Agency`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_reportsToId_fkey` FOREIGN KEY (`reportsToId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserAccess` ADD CONSTRAINT `UserAccess_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Agency` ADD CONSTRAINT `Agency_ownerUserId_fkey` FOREIGN KEY (`ownerUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

