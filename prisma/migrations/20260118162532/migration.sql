/*
  Warnings:

  - A unique constraint covering the columns `[video_id,chunk_index]` on the table `video_chunk` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `video_chunk_video_id_chunk_index_key` ON `video_chunk`(`video_id`, `chunk_index`);
