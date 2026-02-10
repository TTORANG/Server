-- CreateIndex
CREATE INDEX `idx_comment_target` ON `comment`(`target_type`, `target_id`);
