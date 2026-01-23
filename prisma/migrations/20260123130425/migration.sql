-- AddForeignKey
ALTER TABLE `reaction` ADD CONSTRAINT `reaction_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
