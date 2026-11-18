-- CreateTable
CREATE TABLE `AgentTarget` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `month` VARCHAR(191) NOT NULL,
    `collectionAmount` DECIMAL(12, 2) NULL,
    `casesResolved` INTEGER NULL,
    `updatedById` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AgentTarget_month_idx`(`month`),
    UNIQUE INDEX `AgentTarget_userId_month_key`(`userId`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
