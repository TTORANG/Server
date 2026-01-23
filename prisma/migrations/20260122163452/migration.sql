/*
  Warnings:

  - A unique constraint covering the columns `[user_id,session_id,target_type,target_id,timestamp_ms,emoji_type]` on the table `reaction` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `reaction` DROP FOREIGN KEY `reaction_user_id_fkey`;

-- DropIndex
DROP INDEX `reaction_user_id_session_id_target_type_target_id_emoji_type_key` ON `reaction`;

-- AlterTable
ALTER TABLE `reaction` ADD COLUMN `timestamp_ms` INTEGER NULL;

-- CreateIndex
CREATE UNIQUE INDEX `reaction_user_id_session_id_target_type_target_id_timestamp__key` ON `reaction`(`user_id`, `session_id`, `target_type`, `target_id`, `timestamp_ms`, `emoji_type`);

