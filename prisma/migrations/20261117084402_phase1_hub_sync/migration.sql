-- CreateTable
CREATE TABLE `Customer` (
    `id` VARCHAR(191) NOT NULL,
    `hubCustomerId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `mobilePrimary` VARCHAR(191) NULL,
    `mobileAlt` VARCHAR(191) NULL,
    `references` JSON NULL,
    `address` TEXT NULL,
    `pin` VARCHAR(191) NULL,
    `area` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Customer_hubCustomerId_key`(`hubCustomerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Loan` (
    `id` VARCHAR(191) NOT NULL,
    `agreementNo` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `company` ENUM('AF', 'BLD', 'MF', 'MMPL') NOT NULL,
    `branch` VARCHAR(191) NOT NULL,
    `disbursedOn` DATE NULL,
    `emiAmount` DECIMAL(12, 2) NULL,
    `pendingEmis` INTEGER NULL,
    `dpd` INTEGER NULL,
    `overdueAmount` DECIMAL(12, 2) NULL,
    `status` ENUM('ACTIVE', 'CLOSED') NOT NULL DEFAULT 'ACTIVE',
    `lastImportId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Loan_agreementNo_key`(`agreementNo`),
    INDEX `Loan_company_branch_idx`(`company`, `branch`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Allocation` (
    `id` VARCHAR(191) NOT NULL,
    `loanId` VARCHAR(191) NOT NULL,
    `activeLoanId` VARCHAR(191) NULL,
    `agencyId` VARCHAR(191) NULL,
    `agentId` VARCHAR(191) NULL,
    `assignedById` VARCHAR(191) NULL,
    `assignedOn` DATETIME(3) NOT NULL,
    `validTill` DATETIME(3) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `endedAt` DATETIME(3) NULL,
    `importRunId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Allocation_activeLoanId_key`(`activeLoanId`),
    INDEX `Allocation_agentId_active_idx`(`agentId`, `active`),
    INDEX `Allocation_agencyId_active_idx`(`agencyId`, `active`),
    INDEX `Allocation_loanId_idx`(`loanId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ImportRun` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('LOANS', 'ALLOCATIONS') NOT NULL,
    `status` ENUM('RUNNING', 'DONE', 'FAILED') NOT NULL DEFAULT 'RUNNING',
    `fileName` VARCHAR(191) NOT NULL,
    `totalRows` INTEGER NOT NULL DEFAULT 0,
    `created` INTEGER NOT NULL DEFAULT 0,
    `updated` INTEGER NOT NULL DEFAULT 0,
    `unchanged` INTEGER NOT NULL DEFAULT 0,
    `failed` INTEGER NOT NULL DEFAULT 0,
    `errors` JSON NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finishedAt` DATETIME(3) NULL,

    INDEX `ImportRun_type_startedAt_idx`(`type`, `startedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Loan` ADD CONSTRAINT `Loan_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Allocation` ADD CONSTRAINT `Allocation_loanId_fkey` FOREIGN KEY (`loanId`) REFERENCES `Loan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Allocation` ADD CONSTRAINT `Allocation_agencyId_fkey` FOREIGN KEY (`agencyId`) REFERENCES `Agency`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Allocation` ADD CONSTRAINT `Allocation_agentId_fkey` FOREIGN KEY (`agentId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
