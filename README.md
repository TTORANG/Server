<p align='center'>
    <img src="https://capsule-render.vercel.app/api?type=waving&color=4F5BFF&height=300&section=header&text=TTORANG&fontSize=70&animation=fadeIn&fontColor=FFF&fontAlignY=38&desc=쉽고%20빠른%20발표%20피드백%20서비스&descAlignY=51&descAlign=62"/>
</p>

## 🔨 Tech Stack

<div align="center">

|      Type       |                                                                                                                                                                                                                                                                                                                                                                                                 Tool                                                                                                                                                                                                                                                                                                                                                                                                  |
| :-------------: | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
|     Runtime     |                                                                                                                                                                                                                                                                                                                                               ![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)                                                                                                                                                                                                                                                                                                                                                |
|    Language     |                                                                                                                                                                                                                                                                                                                                           ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)                                                                                                                                                                                                                                                                                                                                           |
| Framework / API |                                                                                                                                                                                                                                                                                       ![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white) ![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socketdotio&logoColor=white)                                                                                                                                                                                                                                                                                       |
|  Auth / Token   |                                                                                                                                                                                                                                                                                          ![Passport](https://img.shields.io/badge/Passport-34E27A?style=for-the-badge&logo=passport&logoColor=black) ![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)                                                                                                                                                                                                                                                                                           |
|    Database     |                                                                                                                                                                                                                                                                                               ![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white) ![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)                                                                                                                                                                                                                                                                                                |
|      Cache      |                                                                                                                                                                                                                                                                                                                                                  ![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)                                                                                                                                                                                                                                                                                                                                                   |
|   Docs / Env    |                                                                                                                                                                                                                                                                                            ![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=black) ![dotenv](https://img.shields.io/badge/dotenv-ECD53F?style=for-the-badge&logo=dotenv&logoColor=black)                                                                                                                                                                                                                                                                                             |
|  Cloud / Infra  | ![Google Cloud Storage](https://img.shields.io/badge/Google%20Cloud%20Storage-AECBFA?style=for-the-badge&logo=googlecloudstorage&logoColor=1A73E8) ![Google Cloud Tasks](https://img.shields.io/badge/Google%20Cloud%20Tasks-4285F4?style=for-the-badge&logo=googletasks&logoColor=white)</br>![Cloud Run](https://img.shields.io/badge/Cloud%20Run-4285F4?style=for-the-badge&logo=googlecloud&logoColor=white) ![Cloud Load Balancing](https://img.shields.io/badge/Cloud%20Load%20Balancing-1A73E8?style=for-the-badge&logo=googlecloud&logoColor=white)</br>![Cloud CDN](https://img.shields.io/badge/Cloud%20CDN-34A853?style=for-the-badge&logo=googlecloud&logoColor=white) ![Cloud SQL](https://img.shields.io/badge/Cloud%20SQL-0F9D58?style=for-the-badge&logo=googlecloud&logoColor=white) |
|  Code Quality   |                                                                                                                                                                                                                                                                                           ![ESLint](https://img.shields.io/badge/ESLint-4B3263?style=for-the-badge&logo=eslint&logoColor=white) ![Prettier](https://img.shields.io/badge/Prettier-F7B93E?style=for-the-badge&logo=prettier&logoColor=black)                                                                                                                                                                                                                                                                                           |
| Package Manager |                                                                                                                                                                                                                                                                                                                                                     ![npm](https://img.shields.io/badge/npm-CB3837?style=for-the-badge&logo=npm&logoColor=white)                                                                                                                                                                                                                                                                                                                                                      |
| Version Control |                                                                                                                                                                                                                                                                                                  ![Git](https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white) ![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)                                                                                                                                                                                                                                                                                                   |

</div>

---

</br>
</br>

## 🌟 주요 기능

### 📊 프레젠테이션 관리

- **프로젝트**: 발표 프로젝트 생성, 수정, 삭제, 조회
- **슬라이드**: PPTX/PDF 업로드 후 자동 이미지 변환 및 슬라이드 관리
- **스크립트**: 슬라이드별 발표 대본 작성 및 버전 관리

### 🎥 영상 녹화 & 스트리밍

- **청크 업로드**: WebM/MP4 영상 청크 단위 업로드
- **HLS 트랜스코딩**: FFmpeg 기반 720p + 1080p 자동 변환
- **슬라이드 동기화**: 영상-슬라이드 타임라인 매핑

### 💬 실시간 피드백

- **댓글**: 슬라이드별 / 영상 타임스탬프별 댓글 및 대댓글
- **리액션**: 이모지 반응 (fire, good, bad, sleepy, confused)
- **실시간 동기화**: Socket.io + Redis Pub/Sub 기반 실시간 브로드캐스트

### 📈 분석 대시보드

- 페이지 뷰 / 슬라이드별 조회수 추적
- 영상 재생 이벤트 (play/pause/seek) 기록
- 슬라이드 및 영상 리텐션 분석
- 이탈 지점 분석

### 🔗 공유 링크

- 공개 공유 링크 생성 (슬라이드+스크립트 / 슬라이드+스크립트+영상)
- 만료일 설정 및 조회수 추적

### 🔐 인증 & 보안

- JWT 기반 인증 (Access Token + Refresh Token)
- Passport.js 소셜 로그인 (Google, Kakao, Naver)
- 익명 세션 지원 및 로그인 후 데이터 병합

## 🏗️ 아키텍처 및 설계

### 계층형 아키텍처 (Layered Architecture)

```
┌─────────────────────────────────────┐
│          Controller Layer           │  ← REST API 엔드포인트
├─────────────────────────────────────┤
│           Service Layer             │  ← 비즈니스 로직
├─────────────────────────────────────┤
│         Repository Layer            │  ← 데이터 접근 (Prisma)
├─────────────────────────────────────┤
│         Database (MySQL)            │  ← 영속성 계층
└─────────────────────────────────────┘
```

### 실시간 아키텍처 (Real-time Architecture)

```
HTTP 요청 (댓글/리액션 생성)
  └─> EventBus.publish (Redis Pub/Sub)
        └─> Subscriber Handlers
              ├── notification.handler  → 알림 처리
              └── websocket.handler     → Socket.io 브로드캐스트
                                          └─> Redis Adapter → 모든 클라이언트
```

### 변환 파이프라인 (Conversion Pipeline)

```
PPTX/PDF 업로드
  └─> [Job 1] pptx_to_images / pdf_to_images
        └─> 완료 시 체이닝:
              ├── [Job 2] generate_thumbnail
              └── [Job 3] extract_metadata

영상 청크 업로드 → 녹화 완료
  └─> [Job] video_transcode
        ├── GCS에서 청크 다운로드 (동시성: 5)
        ├── FFmpeg concat 병합
        ├── 메타데이터 추출 (길이, 해상도, fps, 코덱)
        ├── 썸네일 추출
        ├── 슬라이드별 재생 시간 계산
        ├── FFmpeg HLS 트랜스코딩 (720p + 1080p)
        └── HLS 세그먼트 GCS 업로드
```

### 주요 디자인 패턴

- **DTO Pattern**: 계층 간 데이터 전송 및 응답 형식 통일
- **Repository Pattern**: Prisma 기반 데이터 접근 추상화
- **Event-Driven**: Redis Pub/Sub 기반 이벤트 버스
- **Error Handling**: 도메인별 커스텀 에러 클래스 (BaseError 상속)
- **Chunked Upload**: 대용량 영상 청크 분할 업로드

## 🔐 보안 구현

### JWT 인증 플로우

```
1. 사용자 소셜 로그인 요청 (/auth/{provider}/login)
2. OAuth Provider 리다이렉트 및 인증
3. 콜백에서 사용자 upsert 및 세션 생성
4. JWT Access Token (1시간) + Refresh Token (14일) 발급
5. isLogin 미들웨어에서 Bearer 토큰 검증 및 인증 처리
```

### 익명 세션 시스템

```
1. POST /session/anonymous → 익명 사용자 + 세션 생성
2. JWT 발급 (익명 이메일 기반)
3. 익명 상태에서 댓글/리액션 가능
4. POST /session/merge → 소셜 로그인 후 익명 데이터 병합
```

### 보안 기능

- **JWT Token**: Access Token (단기) + Refresh Token (장기) 전략
- **OAuth 2.0**: Google, Kakao, Naver 소셜 로그인
- **CORS 설정**: 프론트엔드 도메인만 허용
- **OIDC 검증**: Cloud Tasks 워커 엔드포인트 인증
- **소유권 검증**: 영상/프로젝트 접근 시 IDOR 방지

## 💾 데이터베이스 설계

### 주요 엔티티

- **User**: 사용자 정보 (OAuth 제공자, 소프트 삭제)
- **Session**: 세션 관리 (JWT Refresh Token, 익명 세션)
- **Project**: 발표 프로젝트
- **Slide**: 프로젝트별 슬라이드
- **Script / ScriptVersion**: 발표 대본 및 버전 이력
- **Video / VideoChunk**: 녹화 영상 및 청크
- **VideoSlideEvent / VideoSlideDuration**: 영상-슬라이드 동기화
- **UploadedFile / ProjectMaterial / SlideAsset**: 파일 및 에셋 관리
- **ConversionJob**: 비동기 변환 작업 상태 추적
- **Comment**: 대댓글 지원 댓글 (슬라이드/영상 타겟)
- **Reaction**: 이모지 리액션 (슬라이드/영상 타겟)
- **ShareLink**: 공유 링크 (스코프별)
- **Analytics\***: 페이지뷰, 슬라이드뷰, 영상 이벤트, 이탈 추적

### 관계 설정

- User ↔ Project: 1:N
- Project ↔ Slide: 1:N
- Slide ↔ Script: 1:1
- Script ↔ ScriptVersion: 1:N
- Project ↔ Video: 1:N
- Video ↔ VideoChunk: 1:N
- Project ↔ Comment: 1:N
- Comment ↔ Comment (replies): 자기 참조 1:N
- User ↔ Reaction: 1:N (슬라이드/영상 리액션 모두 이벤트 누적 저장)
- Project ↔ ShareLink: 1:N

## 📚 API 엔드포인트

### 인증

- `GET /auth/google/login` - Google 소셜 로그인
- `GET /auth/kakao/login` - Kakao 소셜 로그인
- `GET /auth/naver/login` - Naver 소셜 로그인
- `POST /auth/logout` - 로그아웃
- `DELETE /users/:userId` - 회원 탈퇴

### 익명 세션

- `POST /session/anonymous` - 익명 세션 생성
- `POST /session/merge` - 익명 세션 데이터 병합

### 프로젝트

- `POST /presentations/` - 프로젝트 생성
- `GET /presentations/` - 프로젝트 목록 / 검색
- `GET /presentations/:projectId` - 프로젝트 제목 조회
- `PATCH /presentations/:projectId` - 프로젝트 수정
- `DELETE /presentations/:projectId` - 프로젝트 삭제

### 슬라이드

- `GET /presentations/:projectId/slides` - 슬라이드 목록 조회
- `GET /presentations/slides/:slideId` - 슬라이드 상세 조회
- `PATCH /presentations/slides/:slideId` - 슬라이드 제목 수정

### 스크립트

- `PATCH /presentations/slides/:slideId/script` - 스크립트 저장
- `GET /presentations/slides/:slideId/script` - 스크립트 조회
- `GET /presentations/slides/:slideId/versions` - 버전 이력 조회
- `POST /presentations/slides/:slideId/restore` - 버전 복원

### 파일

- `POST /files/upload` - PPTX/PDF 업로드 (변환 자동 시작)
- `GET /presentations/:projectId/status` - 변환 상태 폴링

### 영상

- `POST /videos/start` - 녹화 시작
- `POST /videos/:videoId/chunks/:chunkIndex` - 청크 업로드
- `POST /videos/:videoId/finish` - 녹화 완료 및 인코딩 시작
- `GET /videos/:videoId` - 영상 상세 조회
- `DELETE /videos/:videoId` - 영상 삭제
- `GET /videos/:videoId/slides` - 영상-슬라이드 타임라인

### 댓글

- `POST /slides/:slideId/comments` - 슬라이드 댓글 작성
- `POST /videos/:videoId/comments` - 영상 타임스탬프 댓글 작성
- `PATCH /comments/:commentId` - 댓글 수정
- `DELETE /comments/:commentId` - 댓글 삭제
- `POST /comments/:commentId/replies` - 대댓글 작성

### 리액션

- `POST /slides/:slideId/reactions` - 슬라이드 리액션 생성
- `GET /slides/:slideId/reactions/summary` - 슬라이드 리액션 요약
- `POST /videos/:videoId/reactions` - 영상 타임스탬프 리액션 생성
- `GET /videos/:videoId/reactions/timeline` - 영상 리액션 타임라인

### 공유

- `POST /presentations/:projectId/shares` - 공유 링크 생성
- `GET /shares/:shareToken` - 공유 콘텐츠 조회 (공개)
- `GET /presentations/:projectId/shares` - 공유 링크 목록

### 분석

- `POST /analytics/pageview` - 페이지뷰 기록
- `POST /analytics/slide-view` - 슬라이드뷰 기록
- `POST /analytics/video-event` - 영상 이벤트 기록
- `GET /presentations/:projectId/analytics/summary` - 종합 분석
- `GET /presentations/:projectId/analytics/slides` - 슬라이드별 분석
- `GET /presentations/:projectId/analytics/slide-retention` - 슬라이드 리텐션
- `GET /presentations/:projectId/analytics/recent-comments` - 최근 댓글 분석
- `GET /videos/:videoId/analytics/retention` - 영상 리텐션

> 상세한 API 명세는 Swagger 문서를 참고해주세요.

## 📌 How To Run

### 1) 의존성 설치

```bash
npm install
```

### 2) 환경 변수 설정

- 루트의 `.env` 파일을 프로젝트 환경에 맞게 설정
- DB/Redis/JWT/OAuth/GCP 관련 값 필요

### 3) 개발 서버 실행

```bash
npm run dev
```

### 4) 테스트 실행 (Jest)

- 전체 테스트 실행

```bash
npm run test
```

- 특정 기능 테스트만 실행

```bash
# 파일 업로드 + 변환
npm run test -- tests/files/files.test.js tests/conversion/conversionJob.test.js

# 영상
npm run test -- tests/video

# 댓글
npm run test -- tests/comment

# 리액션
npm run test -- tests/reaction
```

- 실시간 E2E 시나리오 실행

```bash
npm run e2e:realtime
```

</br>
</br>

## 📖 Convention

### Branch Strategy

#### 브랜치 종류:

- Git-Flow를 간소화하여 사용합니다.
- 브랜치는 `이슈 생성 -> 브랜치 생성` 순서로 진행합니다.
- `main`: 배포 가능한 최종 버전 브랜치 (직접 Push 금지)
- 배포는 `dev -> main` 머지로 진행합니다. (`release` 브랜치 미사용)
- `dev`: 개발 통합 브랜치
- `dev`는 항상 빌드/테스트 통과 상태를 유지하고, 부분 완료 기능은 `feat`에서 작업합니다.
- `feat/{기능명}`: 새로운 기능 개발
- `fix/{버그명}`: 버그 수정
- `hotfix/{이슈-요약}`: `main` 배포 후 발생한 긴급 버그 수정

#### 브랜치 명명 예시:

- `feat/[닉네임]-[기능명]`
- `feat/garnet-login`
- `fix/garnet-db-connection`

### Commit

#### 커밋 형식:

```text
<Type> : <Subject>

<Body> (선택사항)

<Footer> (선택사항)
```

#### Commit Type:

- 커밋 타입과 `!` 사용은 Conventional Commits v1.0.0을 따릅니다.
- https://www.conventionalcommits.org/en/v1.0.0/
- `feat`: 새로운 기능 추가
- `fix`: 버그 수정
- `docs`: 문서 수정
- `style`: 코드 포맷팅, 세미콜론 누락 등
- `refactor`: 코드 리팩터링
- `test`: 테스트 코드 추가/수정
- `chore`: 빌드 설정, 패키지 매니저 설정, 파일 이동 등

#### Breaking Change (호환성 파괴):

- API 응답 변경, DB 스키마 변경 등 기존 코드와 호환되지 않는 경우 `Type` 뒤에 `!`를 붙여 명시합니다.
- Not Break: `feat: 로그인 기능`
- Break: `feat!: 로그인 테이블 스키마 변경`

#### 커밋 작성 규칙:

1. Subject는 명령조/현재 시제로 작성하고 끝에 마침표(`.`)를 붙이지 않습니다.
2. Subject는 50자 이내를 권장합니다.
3. Body에는 무엇을/왜 변경했는지 작성합니다. (Breaking Change 시 필수)

#### 작성 예시 (일반 기능):

```text
feat: 교육과정 데이터 DB 적재 로직 구현

- JSON 파일 파싱하여 줄글(Content)로 변환하는 로직 추가
- MariaDB docs 테이블 Insert 쿼리 작성
- pymysql 라이브러리 의존성 추가

Resolves: #12
```

#### 작성 예시 (Breaking Change):

```text
feat!: 로그인 테이블 스키마 변경 (nickname -> name)

기존 name 스키마를 익명성을 위해 nickname 스키마로 변경

BREAKING CHANGE: 기존 nickname 필드는 제거되고 name 필드로 교체됨
Resolves: #45
```

### Issue & PR Convention

#### Issue Template:

```text
[분류][담당자] 작업 내용
```

- `feat`, `fix`, `chore`, `refactor` 등을 사용합니다.
- 예시: `[feat][가넷] 회원가입 API 유효성 검사 추가`
- 예시: `[fix][가넷] 로그인 API 500 에러 수정`

#### PR Title:

- PR 제목은 이슈 번호와 변경 사항을 명시합니다.
- PR은 반드시 `dev` 또는 `main(hotfix)`로만 머지합니다.
- `feat <-> feat` 간 직접 머지는 금지합니다.

```text
[#<이슈번호>] 변경 사항 요약
```

- 예시: `[#3] 로그인 기능 구현`
- 예시: `[#11] 회원 엔티티 스키마 변경`

</br>
</br>

## 📁Project Tree

```text
TTORANG-Server
├─ docs/
│  └─ realtimeE2eScenarios.md
├─ prisma/
│  ├─ migrations/
│  └─ schema.prisma
├─ scripts/
│  └─ realtimeE2eCheck.js
├─ src/
│  ├─ constants/
│  ├─ controllers/
│  ├─ dtos/
│  ├─ errors/
│  ├─ events/
│  │  ├─ subscribers/
│  │  ├─ eventBus.js
│  │  └─ eventTypes.js
│  ├─ middlewares/
│  ├─ queues/
│  ├─ repositories/
│  ├─ routes/
│  ├─ services/
│  │  └─ conversion/
│  ├─ socket/
│  │  ├─ handlers/
│  │  ├─ middleware/
│  │  └─ eventTypes.js
│  ├─ utils/
│  ├─ auth.config.js
│  ├─ db.config.js
│  ├─ index.js
│  └─ swagger.config.js
├─ .env
├─ Dockerfile
├─ docker-compose.yml
├─ package.json
└─ prisma.config.ts
```
