<p align='center'>
    <img src="https://capsule-render.vercel.app/api?type=waving&color=4F5BFF&height=300&section=header&text=TTORANG&fontSize=70&animation=fadeIn&fontColor=FFF&fontAlignY=38&desc=쉽고%20빠른%20발표%20피드백%20서비스&descAlignY=51&descAlign=62"/>
</p>

## 🔨 Tech Stack

<div align="center">

|      Type       |                                                                                                                                        Tool                                                                                                                                        |
| :-------------: | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
|     Runtime     |                                                                                      ![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)                                                                                      |
|    Language     |                                                                                 ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)                                                                                  |
| Framework / API |                             ![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white) ![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socketdotio&logoColor=white)                              |
|  Auth / Token   |                                 ![Passport](https://img.shields.io/badge/Passport-34E27A?style=for-the-badge&logo=passport&logoColor=black) ![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)                                 |
|    Database     |                                      ![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white) ![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)                                      |
|      Cache      |                                                                                         ![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)                                                                                         |
|   Docs / Env    |                                   ![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=black) ![dotenv](https://img.shields.io/badge/dotenv-ECD53F?style=for-the-badge&logo=dotenv&logoColor=black)                                   |
|  Cloud / Infra  | ![Google Cloud Storage](https://img.shields.io/badge/Google%20Cloud%20Storage-AECBFA?style=for-the-badge&logo=googlecloud&logoColor=1A73E8) ![Google Cloud Tasks](https://img.shields.io/badge/Google%20Cloud%20Tasks-4285F4?style=for-the-badge&logo=googlecloud&logoColor=white) |
|  Code Quality   |                                 ![ESLint](https://img.shields.io/badge/ESLint-4B3263?style=for-the-badge&logo=eslint&logoColor=white) ![Prettier](https://img.shields.io/badge/Prettier-F7B93E?style=for-the-badge&logo=prettier&logoColor=black)                                  |
| Package Manager |                                                                                            ![npm](https://img.shields.io/badge/npm-CB3837?style=for-the-badge&logo=npm&logoColor=white)                                                                                            |
| Version Control |                                         ![Git](https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white) ![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)                                         |

</div>

---

</br>
</br>

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
