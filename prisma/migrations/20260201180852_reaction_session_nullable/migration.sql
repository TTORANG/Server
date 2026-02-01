-- DropForeignKey
ALTER TABLE `reaction` DROP FOREIGN KEY `reaction_session_id_fkey`;

-- DropIndex
DROP INDEX `reaction_session_id_fkey` ON `reaction`;

-- AlterTable
ALTER TABLE `reaction` MODIFY `session_id` CHAR(36) NULL;

-- AddForeignKey
ALTER TABLE `reaction` ADD CONSTRAINT `reaction_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `session`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
