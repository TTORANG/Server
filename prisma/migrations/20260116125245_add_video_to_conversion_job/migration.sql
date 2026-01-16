-- DropForeignKey
ALTER TABLE `conversion_job` DROP FOREIGN KEY `conversion_job_uploaded_file_id_fkey`;

-- DropIndex
DROP INDEX `conversion_job_uploaded_file_id_fkey` ON `conversion_job`;

-- AlterTable
ALTER TABLE `conversion_job` ADD COLUMN `video_id` BIGINT NULL,
    MODIFY `uploaded_file_id` BIGINT NULL;

-- AddForeignKey
ALTER TABLE `conversion_job` ADD CONSTRAINT `conversion_job_uploaded_file_id_fkey` FOREIGN KEY (`uploaded_file_id`) REFERENCES `uploaded_file`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversion_job` ADD CONSTRAINT `conversion_job_video_id_fkey` FOREIGN KEY (`video_id`) REFERENCES `video`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
