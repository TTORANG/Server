/*
  Warnings:

  - A unique constraint covering the columns `[script_id,version_number]` on the table `script_version` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,is_anonymous]` on the table `session` will be added. If there are existing duplicate values, this will fail.
  - Made the column `title` on table `project` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `project` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `project` required. This step will fail if there are existing NULL values in that column.
  - Made the column `is_deleted` on table `project` required. This step will fail if there are existing NULL values in that column.
  - Made the column `char_count` on table `script` required. This step will fail if there are existing NULL values in that column.
  - Made the column `estimated_duration_seconds` on table `script` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `script` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `script` required. This step will fail if there are existing NULL values in that column.
  - Made the column `script_text` on table `script_version` required. This step will fail if there are existing NULL values in that column.
  - Made the column `char_count` on table `script_version` required. This step will fail if there are existing NULL values in that column.
  - Made the column `version_number` on table `script_version` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `script_version` required. This step will fail if there are existing NULL values in that column.
  - Made the column `is_active` on table `share_link` required. This step will fail if there are existing NULL values in that column.
  - Made the column `view_count` on table `share_link` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `share_link` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `share_link` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `project` DROP FOREIGN KEY `project_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `script` DROP FOREIGN KEY `script_slide_id_fkey`;

-- DropForeignKey
ALTER TABLE `script_version` DROP FOREIGN KEY `script_version_script_id_fkey`;

-- DropForeignKey
ALTER TABLE `share_link` DROP FOREIGN KEY `share_link_project_id_fkey`;

-- DropIndex
DROP INDEX `project_user_id_fkey` ON `project`;

-- DropIndex
DROP INDEX `script_version_script_id_fkey` ON `script_version`;

-- AlterTable
ALTER TABLE `project` MODIFY `title` VARCHAR(100) NOT NULL,
    MODIFY `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `updated_at` DATETIME(3) NOT NULL,
    MODIFY `is_deleted` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `script` MODIFY `char_count` INTEGER NOT NULL DEFAULT 0,
    MODIFY `estimated_duration_seconds` INTEGER NOT NULL DEFAULT 0,
    MODIFY `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `updated_at` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `script_version` MODIFY `script_text` LONGTEXT NOT NULL,
    MODIFY `char_count` INTEGER NOT NULL,
    MODIFY `version_number` INTEGER NOT NULL,
    MODIFY `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `session` MODIFY `is_anonymous` BOOLEAN NOT NULL DEFAULT false,
    MODIFY `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `share_link` MODIFY `is_active` BOOLEAN NOT NULL DEFAULT true,
    MODIFY `view_count` INTEGER NOT NULL DEFAULT 0,
    MODIFY `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `updated_at` DATETIME(3) NOT NULL;

-- CreateIndex
CREATE INDEX `idx_project_user_created` ON `project`(`user_id`, `created_at` DESC);

-- CreateIndex
CREATE INDEX `idx_project_title` ON `project`(`title`);

-- CreateIndex
CREATE INDEX `idx_project_updated` ON `project`(`updated_at` DESC);

-- CreateIndex
CREATE INDEX `idx_script_updated` ON `script`(`updated_at` DESC);

-- CreateIndex
CREATE INDEX `idx_script_version_script_created` ON `script_version`(`script_id`, `created_at` DESC);

-- CreateIndex
CREATE INDEX `idx_script_version_number` ON `script_version`(`version_number`);

-- CreateIndex
CREATE UNIQUE INDEX `script_version_script_id_version_number_key` ON `script_version`(`script_id`, `version_number`);

-- CreateIndex
CREATE INDEX `session_is_anonymous_idx` ON `session`(`is_anonymous`);

-- CreateIndex
CREATE INDEX `idx_session_created` ON `session`(`created_at`);

-- CreateIndex
CREATE INDEX `idx_session_recent` ON `session`(`last_seen_at` DESC);

-- CreateIndex
CREATE INDEX `idx_user_recent_sessions` ON `session`(`user_id`, `last_seen_at` DESC);

-- CreateIndex
CREATE UNIQUE INDEX `session_user_id_is_anonymous_key` ON `session`(`user_id`, `is_anonymous`);

-- CreateIndex
CREATE INDEX `idx_share_active_expired` ON `share_link`(`is_active`, `expired_at`);

-- CreateIndex
CREATE INDEX `idx_share_project_active` ON `share_link`(`project_id`, `is_active`);

-- CreateIndex
CREATE INDEX `idx_user_email` ON `user`(`email`);

-- CreateIndex
CREATE INDEX `idx_user_oauth` ON `user`(`oauth_provider`, `oauth_id`);

-- AddForeignKey
ALTER TABLE `project` ADD CONSTRAINT `project_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `share_link` ADD CONSTRAINT `share_link_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `script` ADD CONSTRAINT `script_slide_id_fkey` FOREIGN KEY (`slide_id`) REFERENCES `slide`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `script_version` ADD CONSTRAINT `script_version_script_id_fkey` FOREIGN KEY (`script_id`) REFERENCES `script`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `session` RENAME INDEX `session_user_id_fkey` TO `session_user_id_idx`;

-- RenameIndex
ALTER TABLE `share_link` RENAME INDEX `share_link_project_id_fkey` TO `idx_share_project`;
