-- Remove the recruiter feature. Existing recruiters become agents (they keep their cases); their deadline reminders and the two
-- recruiter settings are deleted before the enum values and the endReason column go away.
UPDATE `User` SET `role` = 'AGENT' WHERE `role` = 'RECRUITER';
DELETE FROM `Notification` WHERE `type` = 'RECRUITER_DEADLINE';
DELETE FROM `AppSetting` WHERE `key` IN ('recruiter.escalationDays', 'recruiter.reminderDays');

-- AlterTable
ALTER TABLE `Allocation` DROP COLUMN `endReason`;

-- AlterTable
ALTER TABLE `Notification` MODIFY `type` ENUM('FOLLOW_UP_DUE', 'PTP_DUE', 'ESCALATION', 'REASSIGNED') NOT NULL;

-- AlterTable
ALTER TABLE `User` MODIFY `role` ENUM('ADMIN', 'MANAGER', 'AGENCY_OWNER', 'AGENT') NOT NULL DEFAULT 'AGENT';
