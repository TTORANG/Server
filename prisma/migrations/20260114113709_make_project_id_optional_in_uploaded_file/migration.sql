-- DropForeignKey
ALTER TABLE `uploaded_file` DROP FOREIGN KEY `uploaded_file_project_id_fkey`;

-- DropIndex
DROP INDEX `uploaded_file_project_id_fkey` ON `uploaded_file`;

-- AlterTable
ALTER TABLE `uploaded_file` MODIFY `project_id` BIGINT NULL;

-- AddForeignKey
ALTER TABLE `uploaded_file` ADD CONSTRAINT `uploaded_file_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
