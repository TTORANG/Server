/*
  Warnings:

  - You are about to alter the column `scope` on the `share_link` table. The data in that column could be lost. The data in that column will be cast from `VarChar(50)` to `Enum(EnumId(2))`.

*/
-- AlterTable
ALTER TABLE `share_link` MODIFY `scope` ENUM('slides_script', 'slides_script_video') NOT NULL DEFAULT 'slides_script';
