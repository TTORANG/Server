/*
  Warnings:

  - Made the column `project_id` on table `comment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `project_id` on table `reaction` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `comment` DROP FOREIGN KEY `comment_project_id_fkey`;

-- DropForeignKey
ALTER TABLE `reaction` DROP FOREIGN KEY `reaction_project_id_fkey`;

-- DropIndex
DROP INDEX `comment_project_id_fkey` ON `comment`;

-- DropIndex
DROP INDEX `reaction_project_id_fkey` ON `reaction`;

-- AlterTable
ALTER TABLE `comment` MODIFY `project_id` BIGINT NOT NULL;

-- AlterTable
ALTER TABLE `reaction` MODIFY `project_id` BIGINT NOT NULL;

-- AddForeignKey
ALTER TABLE `comment` ADD CONSTRAINT `comment_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reaction` ADD CONSTRAINT `reaction_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
