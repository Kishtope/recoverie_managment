-- CreateTable
CREATE TABLE `FieldVisit` (
    `id` VARCHAR(191) NOT NULL,
    `loanId` VARCHAR(191) NOT NULL,
    `openLoanId` VARCHAR(191) NULL,
    `fieldAgentId` VARCHAR(191) NULL,
    `source` ENUM('NOT_REACHABLE_3X', 'MANUAL', 'IMPORT') NOT NULL,
    `dueOn` DATE NOT NULL,
    `status` ENUM('OPEN', 'VISITED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `outcome` ENUM('PAID', 'PART_PAID', 'PTP', 'CUSTOMER_NOT_FOUND', 'SHIFTED', 'REFUSED_DISPUTE') NULL,
    `collectedAmount` DECIMAL(12, 2) NULL,
    `receiptNo` VARCHAR(191) NULL,
    `ptpDate` DATE NULL,
    `ptpAmount` DECIMAL(12, 2) NULL,
    `nextFollowUpOn` DATE NULL,
    `photoPath` VARCHAR(191) NULL,
    `lat` DECIMAL(9, 6) NULL,
    `lng` DECIMAL(9, 6) NULL,
    `locationStatus` VARCHAR(191) NULL,
    `visitedAt` DATETIME(3) NULL,
    `closedReason` VARCHAR(191) NULL,
    `remarks` TEXT NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `FieldVisit_openLoanId_key`(`openLoanId`),
    INDEX `FieldVisit_fieldAgentId_status_dueOn_idx`(`fieldAgentId`, `status`, `dueOn`),
    INDEX `FieldVisit_status_dueOn_idx`(`status`, `dueOn`),
    INDEX `FieldVisit_loanId_idx`(`loanId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `FieldVisit` ADD CONSTRAINT `FieldVisit_loanId_fkey` FOREIGN KEY (`loanId`) REFERENCES `Loan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FieldVisit` ADD CONSTRAINT `FieldVisit_fieldAgentId_fkey` FOREIGN KEY (`fieldAgentId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
