-- AlterTable
ALTER TABLE `user` MODIFY `oauth_provider` ENUM('google', 'kakao', 'naver', 'anonymous') NOT NULL;
