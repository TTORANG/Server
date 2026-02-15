-- Allow multiple non-anonymous sessions per user.
-- Drop legacy unique index names if present.
SET @session_unique_idx := (
  SELECT INDEX_NAME
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'session'
    AND NON_UNIQUE = 0
    AND INDEX_NAME IN ('session_user_id_is_anonymous_key', 'uq_session_user_anonymous')
  LIMIT 1
);

SET @drop_session_unique_idx_sql := IF(
  @session_unique_idx IS NOT NULL,
  CONCAT('ALTER TABLE `session` DROP INDEX `', @session_unique_idx, '`'),
  'SELECT 1'
);

PREPARE stmt_drop_unique FROM @drop_session_unique_idx_sql;
EXECUTE stmt_drop_unique;
DEALLOCATE PREPARE stmt_drop_unique;

-- Add lookup index used by auth/session queries when absent.
SET @session_user_anonymous_recent_idx_exists := (
  SELECT COUNT(1)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'session'
    AND INDEX_NAME = 'idx_session_user_anonymous_recent'
);

SET @create_session_user_anonymous_recent_idx_sql := IF(
  @session_user_anonymous_recent_idx_exists = 0,
  'CREATE INDEX `idx_session_user_anonymous_recent` ON `session` (`user_id`, `is_anonymous`, `last_seen_at` DESC)',
  'SELECT 1'
);

PREPARE stmt_create_index FROM @create_session_user_anonymous_recent_idx_sql;
EXECUTE stmt_create_index;
DEALLOCATE PREPARE stmt_create_index;
