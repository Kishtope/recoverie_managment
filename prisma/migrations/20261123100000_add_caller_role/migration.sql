-- Add the CALLER role (a telecaller who phones customers and works their own cases like an agent).
-- AlterTable
ALTER TABLE `User` MODIFY `role` ENUM('ADMIN', 'MANAGER', 'AGENCY_OWNER', 'AGENT', 'CALLER') NOT NULL DEFAULT 'AGENT';
