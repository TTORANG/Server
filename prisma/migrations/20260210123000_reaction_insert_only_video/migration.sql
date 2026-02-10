SET @uq_reaction_idx := (
  SELECT INDEX_NAME
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'reaction'
    AND INDEX_NAME = 'uq_slide_reaction'
  LIMIT 1
);

SET @drop_uq_reaction_idx_sql := IF(
  @uq_reaction_idx IS NOT NULL,
  CONCAT('ALTER TABLE `reaction` DROP INDEX `', @uq_reaction_idx, '`'),
  'SELECT 1'
);

PREPARE stmt FROM @drop_uq_reaction_idx_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @reaction_agg_idx_exists := (
  SELECT COUNT(1)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'reaction'
    AND INDEX_NAME = 'idx_reaction_target_time_emoji_deleted'
);

SET @create_reaction_agg_idx_sql := IF(
  @reaction_agg_idx_exists = 0,
  'CREATE INDEX `idx_reaction_target_time_emoji_deleted` ON `reaction` (`target_type`, `target_id`, `timestamp_ms`, `emoji_type`, `is_deleted`)',
  'SELECT 1'
);

PREPARE stmt2 FROM @create_reaction_agg_idx_sql;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;
