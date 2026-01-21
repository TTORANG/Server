-- DropForeignKey
ALTER TABLE `slide` DROP FOREIGN KEY `slide_project_id_fkey`;

-- DropForeignKey
ALTER TABLE `uploaded_file` DROP FOREIGN KEY `uploaded_file_project_id_fkey`;

-- DropIndex
DROP INDEX `uploaded_file_project_id_fkey` ON `uploaded_file`;

-- AddForeignKey
ALTER TABLE `slide` ADD CONSTRAINT `slide_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `uploaded_file` ADD CONSTRAINT `uploaded_file_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
