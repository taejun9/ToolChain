# Deployment

Node.js 24에서 `npm ci`, `npm run qa`를 실행한다. Cloudflare Workers Static Assets가 dist를 제공하며 브라우저 탐색 요청은 SPA 라우팅으로 처리한다. 서버 바인딩과 런타임 비밀은 필요 없다.

`SITE_URL=https://서비스도메인 npm run build`로 정식 URL이 포함된 sitemap과 robots.txt를 만든다. URL을 생략한 로컬 빌드에서는 빈 sitemap을 생성한다. `npx wrangler deploy --dry-run`으로 배포 구성을 확인하고 `npx wrangler dev --local --port 8787` 후 `node scripts/smoke.mjs http://localhost:8787`로 보안 헤더, 캐시, 정적 파일, 깊은 링크를 확인한다.

사용자 승인 후 GitHub production 환경에 `CLOUDFLARE_ACCOUNT_ID`, Worker 배포 권한을 가진 `CLOUDFLARE_API_TOKEN`과 변수 `SITE_URL`을 등록한다. main에서 Deploy 워크플로를 수동 실행하면 배포 후 동일한 smoke 검사를 실행한다. 실제 계정의 무료 플랜과 도메인 연결을 확인한다.

[Cloudflare SPA routing](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/)

정적 자산 smoke가 통과하면 배포 URL에서 Chromium으로 도구 검색, 텍스트 변환 및 다운로드를 확인한다. 로컬 검증에 사용한 `https://toolchain.example`은 sitemap 생성 검사용 값이다. 실제 배포 시에는 승인된 서비스 도메인을 설정한다.

수동 배포도 가능하다. 승인된 계정으로 `npx wrangler login`을 실행하고, Workers 운영 URL을 확인해 `SITE_URL`을 지정한 프로덕션 빌드를 만든다. 배포 승인 후 `npx wrangler deploy`, `node scripts/smoke.mjs "$SITE_URL"` 순으로 실행한다. 마지막으로 `PLAYWRIGHT_BASE_URL="$SITE_URL" npm run e2e -- --project=chromium`으로 공개 주소의 실제 동작을 검증한다.
