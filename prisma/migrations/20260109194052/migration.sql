/*
  Warnings:

  - Made the column `created_at` on table `slide` required. This step will fail if there are existing NULL values in that column.
  - Made the column `is_deleted` on table `slide` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `slide` MODIFY `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `is_deleted` BOOLEAN NOT NULL DEFAULT false;
