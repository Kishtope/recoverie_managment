-- AlterTable
ALTER TABLE `loan` ADD COLUMN `escalatedAt` DATETIME(3) NULL,
    ADD COLUMN `fieldVisitFlag` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `lastContactedAt` DATETIME(3) NULL,
    ADD COLUMN `lastOutcome` ENUM('PAID', 'PART_PAID', 'PTP', 'CALLBACK', 'NOT_REACHABLE', 'WRONG_NUMBER', 'REFUSED_DISPUTE') NULL,
    ADD COLUMN `nextFollowUpOn` DATE NULL,
    ADD COLUMN `notReachableCount` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `Disposition` (
    `id` VARCHAR(191) NOT NULL,
    `loanId` VARCHAR(191) NOT NULL,
    `agentId` VARCHAR(191) NOT NULL,
    `callId` VARCHAR(191) NULL,
    `outcome` ENUM('PAID', 'PART_PAID', 'PTP', 'CALLBACK', 'NOT_REACHABLE', 'WRONG_NUMBER', 'REFUSED_DISPUTE') NOT NULL,
    `ptpDate` DATE NULL,
    `ptpAmount` DECIMAL(12, 2) NULL,
    `paidAmount` DECIMAL(12, 2) NULL,
    `nextFollowUpOn` DATE NULL,
    `remarks` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Disposition_loanId_createdAt_idx`(`loanId`, `createdAt`),
    INDEX `Disposition_agentId_createdAt_idx`(`agentId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Loan_nextFollowUpOn_idx` ON `Loan`(`nextFollowUpOn`);

-- AddForeignKey
ALTER TABLE `Disposition` ADD CONSTRAINT `Disposition_loanId_fkey` FOREIGN KEY (`loanId`) REFERENCES `Loan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Disposition` ADD CONSTRAINT `Disposition_agentId_fkey` FOREIGN KEY (`agentId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
