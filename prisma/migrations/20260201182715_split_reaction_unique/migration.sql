/*
  Warnings:

  - A unique constraint covering the columns `[user_id,target_type,target_id,emoji_type]` on the table `reaction` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `reaction_user_id_target_type_target_id_emoji_type_key` ON `reaction`(`user_id`, `target_type`, `target_id`, `emoji_type`);
