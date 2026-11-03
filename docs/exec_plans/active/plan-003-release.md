# ToolChain 운영 릴리스

1. 로컬 main 반영과 GitHub 푸시 승인을 확인한다. 원격의 최신 main과 작업 브랜치의 관계를 확인하고 fast-forward 가능한 상태에서 진행한다.
2. GitHub CI가 정확한 릴리스 커밋에서 성공했는지 확인한다.
3. 승인된 Cloudflare 계정, Workers 운영 URL 및 배포 경로를 확인한다. GitHub Actions를 사용할 경우 production 환경의 계정 ID, 토큰과 SITE_URL을 설정한다. Wrangler를 사용할 경우 브라우저 로그인을 마친다.
4. 승인된 운영 URL을 SITE_URL로 빌드하고 배포한다. 배포 결과에 표시된 URL에서 정적 자산·SPA 경로를 검사하고 실제 도구와 워크플로를 브라우저에서 실행한다.
5. 운영 URL과 배포 버전을 기록한다. 브랜치 및 작업 트리를 정리한다.
