import {
  GetShareLinkListResponseDTO,
  getShareCommentsResponseDTO,
  getShareLinkResponseDTO,
  getVideoListResponseDTO,
  shareLinkResponseDTO,
} from "../dtos/shareLink.dto.js";
import {
  processCreateShareLink,
  processGetShareComments,
  processGetShareContent,
  processGetShareLinkList,
  processGetVideoList,
} from "../services/shareLink.service.js";

/**
 * @swagger
 * /presentations/{projectId}/shares:
 *   post:
 *     summary: 공유 링크 생성
 *     description: 특정 프로젝트에 대한 외부 공유 링크를 생성합니다. 영상 포함 여부에 따라 scope를 설정합니다.
 *     tags: [ShareLink]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           example: "123"
 *         description: 공유 링크를 생성할 프로젝트 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               scope:
 *                 type: string
 *                 enum: [slides_script, slides_script_video]
 *                 example: "slides_script_video"
 *                 description: 공유 범위 (슬라이드+대본 또는 슬라이드+대본+영상)
 *               videoId:
 *                 type: string
 *                 example: "456"
 *                 description: scope가 slides_script_video일 경우 필수, slides_script일 경우 선택 사항입니다.
 *               expiredAt:
 *                 type: string
 *                 format: date-time
 *                 description: 링크 만료일 (미지정 시 생성일로부터 7일)
 *     responses:
 *       200:
 *         description: 공유 링크 생성 성공
 *         content:
 *           application/json:
 *             example:
 *               resultType: "SUCCESS"
 *               error: null
 *               success:
 *                 projectId: "123"
 *                 scope: "slides_script_video"
 *                 shareToken: "abc-123-uuid"
 *                 shareUrl: "https://ttorang.app/share/abc-123-uuid"
 *                 sharedContentSummary:
 *                   scope: "slides_script_video"
 *                   projectTitle: "가말고사 발표자료"
 *                   videoTitle: "새로운 연습 1"
 *                   videoCreatedAt: "2024-11-15T14:30:00.000Z"
 *                   thumbnailUrl: "https://storage.googleapis.com/..."
 *                 createdAt: "2026-01-30T10:00:00.000Z"
 *       400:
 *         description: 영상 ID 누락 (L002)
 *         content:
 *           application/json:
 *             example:
 *               resultType: "FAILURE"
 *               error:
 *                 errorCode: "L002"
 *                 reason: "영상을 포함하려면 영상 ID가 필수입니다."
 *                 data: null
 *               success: null
 *       404:
 *         description: 유효한 영상을 찾을 수 없음 (L001)
 *         content:
 *           application/json:
 *             example:
 *               resultType: "FAILURE"
 *               error:
 *                 errorCode: "L001"
 *                 reason: "해당 프로젝트에서 유효한 영상을 찾을 수 없습니다."
 *                 data: null
 *               success: null
 *       403:
 *         description: 프로젝트가 삭제된 링크 (L005)
 *         content:
 *           application/json:
 *             example:
 *               resultType: "FAILURE"
 *               error:
 *                 errorCode: "L005"
 *                 reason: "삭제된 발표입니다."
 *                 data: null
 *               success: null
 */
export const handleCreateShareLink = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const shareData = req.body;

    const shareLink = await processCreateShareLink(projectId, shareData);
    res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: shareLinkResponseDTO(shareLink),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /shares/{shareToken}:
 *   get:
 *     summary: 공유 콘텐츠 조회
 *     description: |
 *       토큰을 통해 외부 공유된 프로젝트 콘텐츠(슬라이드, 대본, 영상, 댓글)를 조회합니다. (인증 불필요)
 *         - [필터링 규칙]
 *         - 공통: 삭제된 댓글(`isDeleted: true`)은 제외됩니다.
 *         - 슬라이드 모드: 슬라이드에 달린 댓글만 반환하며, **삭제된 슬라이드의 댓글은 보안상 제외**됩니다.
 *         - 영상 모드: 해당 공유 링크에 연결된 특정 영상(`videoId`)에 달린 댓글만 반환합니다.
 *     tags: [ShareLink]
 *     parameters:
 *       - in: path
 *         name: shareToken
 *         required: true
 *         schema:
 *           type: string
 *           example: "abc-123-uuid"
 *         description: 공유 링크의 유니크 토큰
 *     responses:
 *       200:
 *         description: 공유 콘텐츠 조회 성공
 *         content:
 *           application/json:
 *             example:
 *               resultType: "SUCCESS"
 *               error: null
 *               success:
 *                 message: "공유된 프로젝트에 접속했습니다."
 *                 sessionInfo:
 *                   sessionId: "106fbf2c-3357-40f7-..."
 *                   name: "또랑한 고양이"
 *                   tokens:
 *                      accessToken: "eyJhbGci..."
 *                      refreshToken: "eyJhbGci..."
 *                 shareInfo:
 *                   shareToken: "abc-123-uuid"
 *                   scope: "slides_script_video"
 *                   createdAt: "2026-01-30T10:00:00.000Z"
 *                 projectContent:
 *                   title: "기말고사 발표 자료"
 *                   slides:
 *                     - slideId: "1"
 *                       slideNum: 1
 *                       title: "도입"
 *                       imageUrl: "https://..."
 *                       scriptText: "안녕하세요 발표자입니다."
 *                       timestampMs: 0
 *                     - slideId: "2"
 *                       slideNum: 2
 *                       title: "핵심 내용"
 *                       imageUrl: "https://..."
 *                       scriptText: "두 번째 슬라이드입니다."
 *                       timestampMs: 45000
 *                   video:
 *                     videoId: "456"
 *                     videoUrl: "https://..."
 *                     thumbnailUrl: "https://..."
 *                   comments:
 *                     - commentId: "1"
 *                       content: "이 부분 설명이 아주 좋네요!"
 *                       userId: "12"
 *                       isMine: true
 *                       writer: "가넷"
 *                       targetType: "video"
 *                       targetId: "456"
 *                       parentId: "2"
 *                       timestampMs: 12000
 *                       createdAt: "2026-02-10T15:00:00.000Z"
 *       403:
 *         description: 유효하지 않거나 만료되거나 프로젝트가 삭제된 링크 (L003, L005, L004)
 *         content:
 *           application/json:
 *             example:
 *               resultType: "FAILURE"
 *               error:
 *                 errorCode: "L004"
 *                 reason: "만료된 공유 링크입니다."
 *                 data: null
 *               success: null
 */
export const handleGetShareContent = async (req, res, next) => {
  try {
    const { shareToken } = req.params;

    const { sessionId } = req.query;

    const result = await processGetShareContent(shareToken, sessionId);

    res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: getShareLinkResponseDTO(result),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /shares/{shareToken}/comments:
 *   get:
 *     summary: 공유 댓글 목록 조회
 *     description: |
 *       토큰을 통해 외부 공유된 프로젝트의 댓글/답글 전체 목록만 조회합니다. (인증 불필요)
 *       - 조회수(viewCount) 및 페이지뷰를 증가시키지 않습니다.
 *       - 댓글 필터링 기준은 기존 공유 콘텐츠 조회와 동일합니다.
 *     tags: [ShareLink]
 *     parameters:
 *       - in: path
 *         name: shareToken
 *         required: true
 *         schema:
 *           type: string
 *           example: "abc-123-uuid"
 *         description: 공유 링크의 유니크 토큰
 *       - in: query
 *         name: sessionId
 *         required: false
 *         schema:
 *           type: string
 *           example: "106fbf2c-3357-40f7-..."
 *         description: 내 댓글 여부(isMine) 계산에 사용할 세션 ID
 *     responses:
 *       200:
 *         description: 공유 댓글 목록 조회 성공
 *         content:
 *           application/json:
 *             example:
 *               resultType: "SUCCESS"
 *               error: null
 *               success:
 *                 comments:
 *                   - commentId: "1"
 *                     content: "이 부분 설명이 아주 좋네요!"
 *                     userId: "12"
 *                     isMine: true
 *                     writer: "가넷"
 *                     targetType: "video"
 *                     targetId: "456"
 *                     parentId: "2"
 *                     timestampMs: 12000
 *                     createdAt: "2026-02-10T15:00:00.000Z"
 *       403:
 *         description: 유효하지 않거나 만료되거나 프로젝트가 삭제된 링크 (L003, L005, L004)
 */
export const handleGetShareComments = async (req, res, next) => {
  try {
    const { shareToken } = req.params;
    const { sessionId } = req.query;
    const comments = await processGetShareComments(shareToken, sessionId);

    res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: getShareCommentsResponseDTO(comments),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /presentations/{projectId}/shares:
 *   get:
 *     summary: 공유 링크 목록 조회
 *     description: 특정 프로젝트에 대해 생성된 모든 공유 링크 목록을 조회합니다.
 *     tags: [ShareLink]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           example: "123"
 *         description: 프로젝트 ID
 *     responses:
 *       200:
 *         description: 공유 링크 목록 조회 성공
 *         content:
 *           application/json:
 *             example:
 *               resultType: "SUCCESS"
 *               error: null
 *               success:
 *                 - scope: "slides_script_video"
 *                   shareToken: "abc-123-uuid"
 *                   isActive: true
 *                   viewCount: 15
 *                   videoTitle: "새로운 연습 1"
 *                   createdAt: "2026-01-30T10:00:00.000Z"
 */
export const handleGetShareLinkList = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const result = await processGetShareLinkList(projectId);

    res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: GetShareLinkListResponseDTO(result),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /presentations/{projectId}/shares/videos:
 *   get:
 *     summary: 공유 가능 영상 목록 조회 (무한 스크롤)
 *     description: |
 *       공유 링크 생성 시 선택 가능한 '녹화 완료(ready)' 상태의 영상 목록을 조회합니다.
 *       **입력값 보정 정책**: `page`, `pageSize`에 부적절한 값(0, 음수, 문자열 등)이 입력될 경우,
 *       에러를 발생시키는 대신 아래와 같이 기본값으로 자동 보정하여 결과를 반환합니다.
 *       - `page`: 1보다 작거나 숫자가 아닐 경우 **1**로 보정
 *       - `pageSize`: 1~50 범위를 벗어날 경우 **최소 1, 최대 50** 사이로 제한 (기본값 10)
 *     tags: [ShareLink]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           example: "123"
 *         description: 영상을 조회할 프로젝트 ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: 조회할 페이지 번호 (부적절한 입력 시 1로 자동 보정)
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: 한 페이지당 보여줄 영상 개수 (최대 50개 제한)
 *     responses:
 *       200:
 *         description: 영상 목록 조회 성공 (데이터가 없어도 SUCCESS이며 빈 배열 반환)
 *         content:
 *           application/json:
 *             example:
 *               resultType: "SUCCESS"
 *               error: null
 *               success:
 *                   videos:
 *                      - id: "456"
 *                        title: "새로운 연습 1"
 *                        thumbnailUrl: "https://..."
 *                        createdAt: "2024-11-15T14:30:00.000Z"
 *                      - id: "457"
 *                        title: "새로운 연습 2"
 *                        thumbnailUrl: "https://..."
 *                        createdAt: "2024-11-15T15:30:00.000Z"
 *                   pagination:
 *                      currentPage: 1
 *                      totalCount: 25
 *                      hasNext: true
 */
export const handleGetVideoListForSharing = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { page, pageSize } = req.query;

    const { videos, currentPage, totalCount, hasNext } = await processGetVideoList(
      projectId,
      page,
      pageSize
    );

    res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: {
        videos: getVideoListResponseDTO(videos),
        pagination: {
          currentPage: currentPage,
          totalCount: totalCount,
          hasNext: hasNext,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
