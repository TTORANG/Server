-- Drop old video reaction unique index to enforce one reaction per user/video/emoji.
-- Handles both named and legacy auto-generated index names.
SET @video_reaction_unique_index := (
  SELECT INDEX_NAME
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'reaction'
    AND INDEX_NAME IN (
      'uq_video_reaction',
      'reaction_user_id_session_id_target_type_target_id_timestamp__key'
    )
  LIMIT 1
);

SET @drop_index_sql := IF(
  @video_reaction_unique_index IS NOT NULL,
  CONCAT('ALTER TABLE `reaction` DROP INDEX `', @video_reaction_unique_index, '`'),
  'SELECT 1'
);

PREPARE drop_stmt FROM @drop_index_sql;
EXECUTE drop_stmt;
DEALLOCATE PREPARE drop_stmt;
