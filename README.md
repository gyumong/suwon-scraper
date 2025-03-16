# Suwon Scraper

suwon-scraper는 수원대학교 포털 및 학사 시스템 데이터를 크롤링하여 학생의 기본정보, 수강 내역, 성적 정보를 수집하고 가공하는 Node.js 기반의 웹 크롤러입니다. AWS ECS에서 Docker를 이용해 컨테이너로 배포하여 실행할 수 있습니다.

### 주요기능

- 학생 기본 정보 크롤링
- 학기별 성적 및 학점 크롤링
- 수강한 과목 세부 정보 크롤링
- Express 기반 API 제공

### 기술스택
TypeScript, Node.js, Playwright, Docker, AWS ECS

### API 엔드포인트

| Method | Endpoint  | Request Body                                      | Description          |
|--------|----------|----------------------------------------------------|----------------------|
| POST   | `/auth`  | `{ "username": "학번", "password": "비밀번호" }`   | 사용자 로그인 인증  |
| POST   | `/scrape`| `{ "username": "학번", "password": "비밀번호" }`   | 데이터 크롤링 및 병합 |
| GET    | `/health`| 없음                                               | 서버 상태 확인      |




