-- CreateTable
CREATE TABLE `Call` (
    `id` VARCHAR(191) NOT NULL,
    `provider` ENUM('MOCK', 'SARV') NOT NULL,
    `providerCallId` VARCHAR(191) NULL,
    `direction` ENUM('OUTBOUND', 'INBOUND') NOT NULL,
    `status` ENUM('INITIATED', 'CONNECTED', 'MISSED', 'FAILED') NOT NULL DEFAULT 'INITIATED',
    `loanId` VARCHAR(191) NULL,
    `agentId` VARCHAR(191) NULL,
    `numberSlot` VARCHAR(191) NULL,
    `customerNumberMask` VARCHAR(191) NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `answeredAt` DATETIME(3) NULL,
    `endedAt` DATETIME(3) NULL,
    `durationSec` INTEGER NULL,
    `recordingUrl` TEXT NULL,
    `failureReason` VARCHAR(191) NULL,
    `callbackResolvedAt` DATETIME(3) NULL,
    `rawEvents` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Call_providerCallId_key`(`providerCallId`),
    INDEX `Call_agentId_startedAt_idx`(`agentId`, `startedAt`),
    INDEX `Call_loanId_startedAt_idx`(`loanId`, `startedAt`),
    INDEX `Call_direction_status_callbackResolvedAt_idx`(`direction`, `status`, `callbackResolvedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Disposition_callId_key` ON `Disposition`(`callId`);

-- AddForeignKey
ALTER TABLE `Disposition` ADD CONSTRAINT `Disposition_callId_fkey` FOREIGN KEY (`callId`) REFERENCES `Call`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Call` ADD CONSTRAINT `Call_loanId_fkey` FOREIGN KEY (`loanId`) REFERENCES `Loan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Call` ADD CONSTRAINT `Call_agentId_fkey` FOREIGN KEY (`agentId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

