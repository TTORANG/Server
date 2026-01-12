-- AlterTable
ALTER TABLE `session` ADD COLUMN `expires_at` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `idx_session_expires` ON `session`(`expires_at`);
