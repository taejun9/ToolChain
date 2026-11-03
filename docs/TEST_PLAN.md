# Test plan

Vitest로 레지스트리, 데이터 및 DAG 검증, 도구, 템플릿과 직렬화를 검증한다. Playwright로 검색, 변환, 노드 편집, 실제 이미지 다운로드, 저장·재로드, 반응형 및 설정을 검증한다. 빌드와 Cloudflare 라우팅은 로컬에서 재현한다.

Playwright는 Vite의 빌드 미리보기 또는 `PLAYWRIGHT_BASE_URL=http://localhost:8787`을 지정한 로컬 Wrangler 서버를 사용한다. Chromium, Firefox, WebKit에서 실제 워크플로, JPEG/WebP 인코딩과 다운로드를 검증한다. axe의 WCAG A/AA 규칙은 중복을 줄이기 위해 Chromium에서 홈, 이미지 도구, 편집기, 설정에 각각 실행한다.

macOS에서 Playwright Firefox가 `Could not find profile folder`로 종료되면 격리된 앱 데이터 디렉터리로 실행할 수 있다.

```sh
tc_firefox=$(mktemp -d)
CFFIXED_USER_HOME="$tc_firefox" npm run e2e
```

[Playwright Firefox macOS issue](https://github.com/microsoft/playwright/issues/42768)

`npm run e2e`는 macOS에서 이 격리 경로를 자동으로 생성하고 테스트 종료 후 정리한다.

후속 테스트는 PDF 파일의 실제 페이지 순서·크기, ZIP 바이너리 왕복과 경로 거부, 스케줄러의 동시 실행·의존성 순서, 선택되지 않은 분기의 스킵, 진단 내보내기의 원본 제외, 새로운 브라우저 컨텍스트에서 공유 링크를 여는 흐름을 검증한다.
