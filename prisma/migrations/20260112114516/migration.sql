/*
  Warnings:

  - A unique constraint covering the columns `[uploaded_file_id]` on the table `project_material` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `project_material_uploaded_file_id_key` ON `project_material`(`uploaded_file_id`);
