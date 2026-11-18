-- CreateTable
CREATE TABLE `Batch` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('CALL', 'FR') NOT NULL,
    `status` ENUM('DRAFT', 'OPEN', 'IN_PROGRESS', 'CLOSED') NOT NULL DEFAULT 'DRAFT',
    `agencyId` VARCHAR(191) NULL,
    `assignedOn` DATETIME(3) NULL,
    `closedAt` DATETIME(3) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Batch_name_key`(`name`),
    INDEX `Batch_type_status_idx`(`type`, `status`),
    INDEX `Batch_agencyId_idx`(`agencyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BatchLoan` (
    `batchId` VARCHAR(191) NOT NULL,
    `loanId` VARCHAR(191) NOT NULL,

    INDEX `BatchLoan_loanId_idx`(`loanId`),
    PRIMARY KEY (`batchId`, `loanId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Batch` ADD CONSTRAINT `Batch_agencyId_fkey` FOREIGN KEY (`agencyId`) REFERENCES `Agency`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BatchLoan` ADD CONSTRAINT `BatchLoan_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `Batch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BatchLoan` ADD CONSTRAINT `BatchLoan_loanId_fkey` FOREIGN KEY (`loanId`) REFERENCES `Loan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
