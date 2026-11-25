-- AlterTable
ALTER TABLE `customer` ADD COLUMN `dob` DATE NULL,
    ADD COLUMN `landlordMobile` VARCHAR(191) NULL,
    ADD COLUMN `landlordName` VARCHAR(191) NULL,
    ADD COLUMN `landmark` VARCHAR(191) NULL,
    ADD COLUMN `occupation` VARCHAR(191) NULL,
    ADD COLUMN `pan` VARCHAR(191) NULL,
    ADD COLUMN `residenceType` VARCHAR(191) NULL,
    ADD COLUMN `state` VARCHAR(191) NULL,
    ADD COLUMN `workAddress` TEXT NULL;

-- AlterTable
ALTER TABLE `loan` ADD COLUMN `agreementDate` DATE NULL,
    ADD COLUMN `applicationNo` VARCHAR(191) NULL,
    ADD COLUMN `brand` VARCHAR(191) NULL,
    ADD COLUMN `lastPaymentOn` DATE NULL,
    ADD COLUMN `loanAmount` DECIMAL(12, 2) NULL,
    ADD COLUMN `lockStatus` VARCHAR(191) NULL,
    ADD COLUMN `lockStatusAt` VARCHAR(191) NULL,
    ADD COLUMN `oldestOverdueEmiNo` INTEGER NULL,
    ADD COLUMN `oldestOverdueOn` DATE NULL,
    ADD COLUMN `otherDueCharges` DECIMAL(12, 2) NULL,
    ADD COLUMN `penaltyCharges` DECIMAL(12, 2) NULL,
    ADD COLUMN `productName` VARCHAR(191) NULL,
    ADD COLUMN `roi` DECIMAL(5, 2) NULL,
    ADD COLUMN `schemeName` VARCHAR(191) NULL,
    ADD COLUMN `tenureMonths` INTEGER NULL,
    ADD COLUMN `totalOutstanding` DECIMAL(12, 2) NULL,
    ADD COLUMN `totalPaid` DECIMAL(12, 2) NULL,
    ADD COLUMN `totalRepaymentAmount` DECIMAL(12, 2) NULL;

-- AlterTable
ALTER TABLE `retailer` ADD COLUMN `state` VARCHAR(191) NULL;
