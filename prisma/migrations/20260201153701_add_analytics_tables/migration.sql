-- CreateTable
CREATE TABLE `analytics_page_view` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `project_id` BIGINT NOT NULL,
    `session_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_analytics_pageview_project`(`project_id`, `created_at`),
    INDEX `idx_analytics_pageview_session`(`session_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `analytics_slide_view` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `project_id` BIGINT NOT NULL,
    `slide_id` BIGINT NOT NULL,
    `session_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_analytics_slideview_project_slide`(`project_id`, `slide_id`),
    INDEX `idx_analytics_slideview_session`(`session_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `analytics_video_event` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `video_id` BIGINT NOT NULL,
    `session_id` CHAR(36) NOT NULL,
    `event_type` ENUM('play', 'pause', 'seek') NOT NULL,
    `timestamp_ms` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_analytics_video_event_video`(`video_id`, `event_type`),
    INDEX `idx_analytics_video_event_session`(`session_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `analytics_exit` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `project_id` BIGINT NOT NULL,
    `session_id` CHAR(36) NOT NULL,
    `last_slide_id` BIGINT NULL,
    `last_video_id` BIGINT NULL,
    `last_video_time_ms` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_analytics_exit_project`(`project_id`),
    INDEX `idx_analytics_exit_session`(`session_id`),
    INDEX `idx_analytics_exit_slide`(`last_slide_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `analytics_page_view` ADD CONSTRAINT `analytics_page_view_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `analytics_page_view` ADD CONSTRAINT `analytics_page_view_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `session`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `analytics_slide_view` ADD CONSTRAINT `analytics_slide_view_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `analytics_slide_view` ADD CONSTRAINT `analytics_slide_view_slide_id_fkey` FOREIGN KEY (`slide_id`) REFERENCES `slide`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `analytics_slide_view` ADD CONSTRAINT `analytics_slide_view_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `session`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `analytics_video_event` ADD CONSTRAINT `analytics_video_event_video_id_fkey` FOREIGN KEY (`video_id`) REFERENCES `video`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `analytics_video_event` ADD CONSTRAINT `analytics_video_event_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `session`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `analytics_exit` ADD CONSTRAINT `analytics_exit_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `analytics_exit` ADD CONSTRAINT `analytics_exit_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `session`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `analytics_exit` ADD CONSTRAINT `analytics_exit_last_slide_id_fkey` FOREIGN KEY (`last_slide_id`) REFERENCES `slide`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `analytics_exit` ADD CONSTRAINT `analytics_exit_last_video_id_fkey` FOREIGN KEY (`last_video_id`) REFERENCES `video`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
