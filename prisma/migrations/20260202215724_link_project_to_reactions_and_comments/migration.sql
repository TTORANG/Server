/*
  Warnings:

  - Added the required column `project_id` to the `comment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `project_id` to the `reaction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `comment` ADD COLUMN `project_id` BIGINT NOT NULL,
    MODIFY `target_type` ENUM('project', 'slide', 'video') NOT NULL;

-- AlterTable
ALTER TABLE `reaction` ADD COLUMN `project_id` BIGINT NOT NULL,
    MODIFY `target_type` ENUM('project', 'slide', 'video') NOT NULL;

-- AddForeignKey
ALTER TABLE `comment` ADD CONSTRAINT `comment_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reaction` ADD CONSTRAINT `reaction_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
