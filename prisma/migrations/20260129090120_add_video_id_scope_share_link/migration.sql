-- AlterTable
ALTER TABLE `share_link` ADD COLUMN `scope` VARCHAR(50) NOT NULL DEFAULT 'slides_script',
    ADD COLUMN `video_id` BIGINT NULL;

-- AddForeignKey
ALTER TABLE `share_link` ADD CONSTRAINT `share_link_video_id_fkey` FOREIGN KEY (`video_id`) REFERENCES `video`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
