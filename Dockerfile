FROM mcr.microsoft.com/playwright:v1.41.0-focal

WORKDIR /app

# 패키지 파일 복사
COPY package.json yarn.lock ./

# 의존성 설치
RUN yarn install --frozen-lockfile

# 소스 코드 복사
COPY . .

# TypeScript 빌드
RUN yarn build

# 포트 설정
EXPOSE 3000

# 실행 명령
CMD ["yarn", "start"] 