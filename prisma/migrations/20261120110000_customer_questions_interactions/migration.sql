-- AlterTable
ALTER TABLE `disposition` ADD COLUMN `callbackTime` VARCHAR(5) NULL,
    ADD COLUMN `category` VARCHAR(40) NULL,
    ADD COLUMN `outcomeDetail` VARCHAR(20) NULL,
    ADD COLUMN `paymentDate` DATE NULL,
    ADD COLUMN `reason` VARCHAR(500) NULL,
    ADD COLUMN `remainingAmount` DECIMAL(12, 2) NULL,
    ADD COLUMN `transactionRef` VARCHAR(100) NULL,
    MODIFY `outcome` ENUM('PAID', 'PART_PAID', 'PTP', 'CALLBACK', 'NOT_REACHABLE', 'WRONG_NUMBER', 'REFUSED_DISPUTE', 'NOT_INTERESTED') NOT NULL;

-- AlterTable
ALTER TABLE `loan` MODIFY `lastOutcome` ENUM('PAID', 'PART_PAID', 'PTP', 'CALLBACK', 'NOT_REACHABLE', 'WRONG_NUMBER', 'REFUSED_DISPUTE', 'NOT_INTERESTED') NULL;

-- CreateTable
CREATE TABLE `CustomerQuestion` (
    `id` VARCHAR(191) NOT NULL,
    `text` VARCHAR(500) NOT NULL,
    `category` ENUM('CUSTOMER_VERIFICATION', 'PAYMENT_RELATED', 'LOAN_RELATED', 'PAYMENT_DELAY_REASON', 'PROMISE_TO_PAY', 'FOLLOW_UP_RELATED', 'GENERAL_QUERIES') NOT NULL,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CustomerQuestion_active_category_displayOrder_idx`(`active`, `category`, `displayOrder`),
    INDEX `CustomerQuestion_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InteractionResponse` (
    `id` VARCHAR(191) NOT NULL,
    `dispositionId` VARCHAR(191) NOT NULL,
    `questionId` VARCHAR(191) NULL,
    `questionText` VARCHAR(500) NOT NULL,
    `category` ENUM('CUSTOMER_VERIFICATION', 'PAYMENT_RELATED', 'LOAN_RELATED', 'PAYMENT_DELAY_REASON', 'PROMISE_TO_PAY', 'FOLLOW_UP_RELATED', 'GENERAL_QUERIES') NOT NULL,
    `response` TEXT NOT NULL,
    `remarks` VARCHAR(500) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `InteractionResponse_dispositionId_idx`(`dispositionId`),
    INDEX `InteractionResponse_questionId_idx`(`questionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CustomerQuestion` ADD CONSTRAINT `CustomerQuestion_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InteractionResponse` ADD CONSTRAINT `InteractionResponse_dispositionId_fkey` FOREIGN KEY (`dispositionId`) REFERENCES `Disposition`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
