-- The FIELD_AGENT role is removed (no field visits in this project; it tracks collection only).
-- Data step first: existing field agents become agents, so their allocated cases and recorded outcomes keep working.
UPDATE `User` SET `role` = 'AGENT' WHERE `role` = 'FIELD_AGENT';

-- AlterTable
ALTER TABLE `User` MODIFY `role` ENUM('ADMIN', 'MANAGER', 'AGENCY_OWNER', 'AGENT') NOT NULL DEFAULT 'AGENT';
