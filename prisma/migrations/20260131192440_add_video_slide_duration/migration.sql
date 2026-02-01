-- CreateTable
CREATE TABLE `video_slide_duration` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `video_id` BIGINT NOT NULL,
    `slide_id` BIGINT NOT NULL,
    `total_duration_ms` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `video_slide_duration_video_id_slide_id_key`(`video_id`, `slide_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `video_slide_duration` ADD CONSTRAINT `video_slide_duration_video_id_fkey` FOREIGN KEY (`video_id`) REFERENCES `video`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `video_slide_duration` ADD CONSTRAINT `video_slide_duration_slide_id_fkey` FOREIGN KEY (`slide_id`) REFERENCES `slide`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
