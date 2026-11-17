-- Phase 2B (field recovery) was dropped: the project tracks collection only. Removes the FieldVisit table added by 20261117105545_phase2b_field_visits.

-- DropForeignKey
ALTER TABLE `FieldVisit` DROP FOREIGN KEY `FieldVisit_fieldAgentId_fkey`;

-- DropForeignKey
ALTER TABLE `FieldVisit` DROP FOREIGN KEY `FieldVisit_loanId_fkey`;

-- DropTable
DROP TABLE `FieldVisit`;
