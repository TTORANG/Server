/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `user` will be added. If there are existing duplicate values, this will fail.
  - Made the column `name` on table `user` required. This step will fail if there are existing NULL values in that column.
  - Made the column `email` on table `user` required. This step will fail if there are existing NULL values in that column.
  - Made the column `oauth_provider` on table `user` required. This step will fail if there are existing NULL values in that column.
  - Made the column `oauth_id` on table `user` required. This step will fail if there are existing NULL values in that column.
  - Made the column `role` on table `user` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `user` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `user` required. This step will fail if there are existing NULL values in that column.
  - Made the column `is_deleted` on table `user` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `user` MODIFY `name` VARCHAR(100) NOT NULL,
    MODIFY `email` VARCHAR(200) NOT NULL,
    MODIFY `oauth_provider` ENUM('google', 'kakao', 'naver') NOT NULL,
    MODIFY `oauth_id` VARCHAR(100) NOT NULL,
    MODIFY `role` ENUM('user', 'admin', 'anonymous') NOT NULL DEFAULT 'user',
    MODIFY `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `updated_at` DATETIME(3) NOT NULL,
    MODIFY `is_deleted` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX `user_email_key` ON `user`(`email`);
