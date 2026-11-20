-- DropForeignKey
ALTER TABLE `batch` DROP FOREIGN KEY `Batch_agencyId_fkey`;

-- DropForeignKey
ALTER TABLE `batchloan` DROP FOREIGN KEY `BatchLoan_batchId_fkey`;

-- DropForeignKey
ALTER TABLE `batchloan` DROP FOREIGN KEY `BatchLoan_loanId_fkey`;

-- DropTable
DROP TABLE `batch`;

-- DropTable
DROP TABLE `batchloan`;

