-- Add the OTHER outcome (a call result that fits none of the listed outcomes; remarks explain it).
-- AlterTable
ALTER TABLE `disposition` MODIFY `outcome` ENUM('PAID', 'PART_PAID', 'PTP', 'CALLBACK', 'NOT_REACHABLE', 'WRONG_NUMBER', 'REFUSED_DISPUTE', 'NOT_INTERESTED', 'OTHER') NOT NULL;

-- AlterTable
ALTER TABLE `loan` MODIFY `lastOutcome` ENUM('PAID', 'PART_PAID', 'PTP', 'CALLBACK', 'NOT_REACHABLE', 'WRONG_NUMBER', 'REFUSED_DISPUTE', 'NOT_INTERESTED', 'OTHER') NULL;
