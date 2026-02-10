-- AlterTable
ALTER TABLE `conversion_job` ADD COLUMN `project_id` BIGINT NULL;

-- AddForeignKey
ALTER TABLE `conversion_job` ADD CONSTRAINT `conversion_job_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
