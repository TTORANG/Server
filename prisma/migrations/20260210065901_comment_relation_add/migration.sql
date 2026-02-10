-- AddForeignKey
ALTER TABLE `comment` ADD CONSTRAINT `comment_slide_id_fkey` FOREIGN KEY (`target_id`) REFERENCES `slide`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
