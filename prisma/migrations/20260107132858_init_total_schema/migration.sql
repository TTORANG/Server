-- CreateTable
CREATE TABLE `user` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `nick_name` VARCHAR(20) NULL,
    `email` VARCHAR(200) NOT NULL,
    `oauth_provider` ENUM('google', 'kakao', 'naver') NOT NULL,
    `oauth_id` VARCHAR(100) NOT NULL,
    `role` ENUM('user', 'admin', 'anonymous') NOT NULL DEFAULT 'user',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `user_email_key`(`email`),
    INDEX `idx_user_email`(`email`),
    INDEX `idx_user_oauth`(`oauth_provider`, `oauth_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `session` (
    `id` CHAR(36) NOT NULL,
    `user_id` BIGINT NOT NULL,
    `refresh_token` TEXT NULL,
    `is_anonymous` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_seen_at` DATETIME(3) NULL,

    INDEX `session_user_id_idx`(`user_id`),
    INDEX `session_is_anonymous_idx`(`is_anonymous`),
    INDEX `idx_session_token`(`refresh_token`(255)),
    INDEX `idx_session_created`(`created_at`),
    INDEX `idx_session_recent`(`last_seen_at` DESC),
    INDEX `idx_user_recent_sessions`(`user_id`, `last_seen_at` DESC),
    UNIQUE INDEX `session_user_id_is_anonymous_key`(`user_id`, `is_anonymous`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `title` VARCHAR(100) NOT NULL,
    `thumbnail_url` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `idx_project_user_created`(`user_id`, `created_at` DESC),
    INDEX `idx_project_title`(`title`),
    INDEX `idx_project_updated`(`updated_at` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `share_link` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `project_id` BIGINT NOT NULL,
    `share_token` VARCHAR(255) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `expired_at` DATETIME(3) NULL,
    `view_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_share_project`(`project_id`),
    INDEX `idx_share_active_expired`(`is_active`, `expired_at`),
    INDEX `idx_share_project_active`(`project_id`, `is_active`),
    UNIQUE INDEX `share_link_share_token_key`(`share_token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `comment` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `session_id` CHAR(36) NOT NULL,
    `target_type` ENUM('slide', 'video') NOT NULL,
    `target_id` BIGINT NOT NULL,
    `timestamp_ms` INTEGER NULL,
    `parent_id` BIGINT NULL,
    `content` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL,
    `updated_at` DATETIME(3) NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reaction` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `session_id` CHAR(36) NOT NULL,
    `target_type` ENUM('slide', 'video') NOT NULL,
    `target_id` BIGINT NOT NULL,
    `emoji_type` VARCHAR(32) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `reaction_user_id_session_id_target_type_target_id_emoji_type_key`(`user_id`, `session_id`, `target_type`, `target_id`, `emoji_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `slide` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `project_id` BIGINT NOT NULL,
    `title` VARCHAR(100) NULL,
    `slide_num` BIGINT NULL,
    `source_index` INTEGER NULL,
    `created_at` DATETIME(3) NULL,
    `updated_at` DATETIME(3) NULL,
    `is_deleted` BOOLEAN NULL,

    UNIQUE INDEX `slide_project_id_slide_num_key`(`project_id`, `slide_num`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `script` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `slide_id` BIGINT NOT NULL,
    `script_text` LONGTEXT NULL,
    `char_count` INTEGER NOT NULL DEFAULT 0,
    `estimated_duration_seconds` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `script_slide_id_key`(`slide_id`),
    INDEX `idx_script_updated`(`updated_at` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `script_version` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `script_id` BIGINT NOT NULL,
    `script_text` LONGTEXT NOT NULL,
    `char_count` INTEGER NOT NULL,
    `version_number` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_script_version_script_created`(`script_id`, `created_at` DESC),
    INDEX `idx_script_version_number`(`version_number`),
    UNIQUE INDEX `script_version_script_id_version_number_key`(`script_id`, `version_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `uploaded_file` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `project_id` BIGINT NOT NULL,
    `original_filename` VARCHAR(255) NOT NULL,
    `content_type` VARCHAR(100) NOT NULL,
    `file_ext` ENUM('pptx', 'pdf') NOT NULL,
    `size_bytes` BIGINT NOT NULL,
    `sha256` CHAR(64) NULL,
    `storage_bucket` VARCHAR(100) NOT NULL,
    `storage_key` VARCHAR(100) NOT NULL,
    `storage_url` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_material` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `project_id` BIGINT NULL,
    `uploaded_file_id` BIGINT NULL,
    `file_type` ENUM('pptx', 'pdf') NOT NULL,
    `page_count` INTEGER NOT NULL,
    `thumbnail_slide_num` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `video` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `project_id` BIGINT NULL,
    `title` VARCHAR(100) NULL,
    `status` ENUM('recording', 'uploading', 'processing', 'ready', 'failed', 'deleted') NOT NULL,
    `duration_seconds` INTEGER NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `fps` DECIMAL(5, 2) NULL,
    `codec` VARCHAR(50) NULL,
    `container` ENUM('mp4', 'webm') NULL,
    `source_storage_bucket` VARCHAR(100) NULL,
    `source_storage_key` VARCHAR(500) NULL,
    `source_url` TEXT NULL,
    `hls_master_url` TEXT NULL,
    `thumbnail_url` TEXT NULL,
    `error_message` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `video_chunk` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `video_id` BIGINT NOT NULL,
    `chunk_index` INTEGER NOT NULL,
    `size_bytes` BIGINT NOT NULL,
    `sha256` CHAR(64) NULL,
    `storage_bucket` VARCHAR(100) NOT NULL,
    `storage_key` VARCHAR(500) NOT NULL,
    `url` TEXT NOT NULL,
    `uploaded_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `video_slide_event` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `slide_id` BIGINT NOT NULL,
    `video_id` BIGINT NOT NULL,
    `event_type` ENUM('enter', 'leave') NOT NULL,
    `timestamp_ms` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `slide_asset` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `slide_id` BIGINT NOT NULL,
    `conversion_job_id` BIGINT NULL,
    `asset_type` ENUM('image', 'thumbnail') NOT NULL,
    `format` ENUM('png', 'jpeg', 'webp') NOT NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `size_bytes` BIGINT NULL,
    `storage_bucket` VARCHAR(100) NOT NULL,
    `storage_key` VARCHAR(500) NOT NULL,
    `url` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conversion_job` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `uploaded_file_id` BIGINT NOT NULL,
    `job_type` ENUM('pptx_to_images', 'pdf_to_images', 'extract_metadata', 'generate_thumbnail', 'video_transcode', 'hls_packaging') NOT NULL,
    `status` ENUM('queued', 'processing', 'completed', 'failed') NOT NULL,
    `progress` TINYINT UNSIGNED NOT NULL,
    `error_code` VARCHAR(50) NULL,
    `error_message` TEXT NULL,
    `started_at` DATETIME(3) NULL,
    `finished_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `session` ADD CONSTRAINT `session_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project` ADD CONSTRAINT `project_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `share_link` ADD CONSTRAINT `share_link_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comment` ADD CONSTRAINT `comment_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comment` ADD CONSTRAINT `comment_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `session`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comment` ADD CONSTRAINT `comment_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `comment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reaction` ADD CONSTRAINT `reaction_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reaction` ADD CONSTRAINT `reaction_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `session`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `slide` ADD CONSTRAINT `slide_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `script` ADD CONSTRAINT `script_slide_id_fkey` FOREIGN KEY (`slide_id`) REFERENCES `slide`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `script_version` ADD CONSTRAINT `script_version_script_id_fkey` FOREIGN KEY (`script_id`) REFERENCES `script`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `uploaded_file` ADD CONSTRAINT `uploaded_file_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_material` ADD CONSTRAINT `project_material_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_material` ADD CONSTRAINT `project_material_uploaded_file_id_fkey` FOREIGN KEY (`uploaded_file_id`) REFERENCES `uploaded_file`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `video` ADD CONSTRAINT `video_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `video_chunk` ADD CONSTRAINT `video_chunk_video_id_fkey` FOREIGN KEY (`video_id`) REFERENCES `video`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `video_slide_event` ADD CONSTRAINT `video_slide_event_slide_id_fkey` FOREIGN KEY (`slide_id`) REFERENCES `slide`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `video_slide_event` ADD CONSTRAINT `video_slide_event_video_id_fkey` FOREIGN KEY (`video_id`) REFERENCES `video`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `slide_asset` ADD CONSTRAINT `slide_asset_slide_id_fkey` FOREIGN KEY (`slide_id`) REFERENCES `slide`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `slide_asset` ADD CONSTRAINT `slide_asset_conversion_job_id_fkey` FOREIGN KEY (`conversion_job_id`) REFERENCES `conversion_job`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversion_job` ADD CONSTRAINT `conversion_job_uploaded_file_id_fkey` FOREIGN KEY (`uploaded_file_id`) REFERENCES `uploaded_file`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
