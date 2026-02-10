SET @reaction_user_idx_exists := (
  SELECT COUNT(1)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'reaction'
    AND INDEX_NAME = 'idx_reaction_user_id'
);

SET @create_reaction_user_idx_sql := IF(
  @reaction_user_idx_exists = 0,
  'CREATE INDEX `idx_reaction_user_id` ON `reaction` (`user_id`)',
  'SELECT 1'
);

PREPARE stmt0 FROM @create_reaction_user_idx_sql;
EXECUTE stmt0;
DEALLOCATE PREPARE stmt0;

SET @reaction_user_fk_name := (
  SELECT CONSTRAINT_NAME
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'reaction'
    AND COLUMN_NAME = 'user_id'
    AND REFERENCED_TABLE_NAME = 'user'
  LIMIT 1
);

SET @drop_reaction_user_fk_sql := IF(
  @reaction_user_fk_name IS NOT NULL,
  CONCAT('ALTER TABLE `reaction` DROP FOREIGN KEY `', @reaction_user_fk_name, '`'),
  'SELECT 1'
);

PREPARE stmt_fk_drop FROM @drop_reaction_user_fk_sql;
EXECUTE stmt_fk_drop;
DEALLOCATE PREPARE stmt_fk_drop;

SET @legacy_reaction_unique_idx := (
  SELECT INDEX_NAME
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'reaction'
    AND INDEX_NAME IN (
      'uq_slide_reaction',
      'reaction_user_id_target_type_target_id_emoji_type_key'
    )
  LIMIT 1
);

SET @drop_legacy_reaction_unique_idx_sql := IF(
  @legacy_reaction_unique_idx IS NOT NULL,
  CONCAT('ALTER TABLE `reaction` DROP INDEX `', @legacy_reaction_unique_idx, '`'),
  'SELECT 1'
);

PREPARE stmt FROM @drop_legacy_reaction_unique_idx_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_reaction_user_fk_sql := IF(
  @reaction_user_fk_name IS NOT NULL,
  CONCAT(
    'ALTER TABLE `reaction` ADD CONSTRAINT `',
    @reaction_user_fk_name,
    '` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE'
  ),
  'SELECT 1'
);

PREPARE stmt_fk_add FROM @add_reaction_user_fk_sql;
EXECUTE stmt_fk_add;
DEALLOCATE PREPARE stmt_fk_add;

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
