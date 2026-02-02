-- DropForeignKey
ALTER TABLE `comment` DROP FOREIGN KEY `comment_session_id_fkey`;

-- DropIndex
DROP INDEX `comment_session_id_fkey` ON `comment`;

-- AlterTable
ALTER TABLE `comment` MODIFY `session_id` CHAR(36) NULL;

-- AddForeignKey
ALTER TABLE `comment` ADD CONSTRAINT `comment_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `session`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
