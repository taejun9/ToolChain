# ToolChain MVP review

검토 항목은 입력·출력 포트와 위상 정렬, 잘못된 연결 및 의존 오류, Worker 취소와 해제, 파일 미전송, IndexedDB 저장 범위, 정적 자산 CSP, 빌드 시 검색 메타데이터 생성이다. 주요 흐름을 Chromium, Firefox, WebKit에서 실행했으며 JPEG/WebP의 파일 시그니처와 리사이즈 결과를 비교했다. 데스크톱 홈·편집기와 모바일 다크 모드를 시각적으로 확인했다.

검토 과정에서 WebKit용 지연 WebP 인코더를 추가하고, macOS Firefox 테스트의 임시 앱 데이터와 정리를 격리했다. 14개 도구 및 6개 템플릿을 포함한 MVP는 로컬 검증을 마쳤다. 프로덕션 응답과 검색 색인 검증에는 승인된 서비스 URL이 필요하다.

- [검증 결과](../PROGRESS.md)
- [배포 절차](../DEPLOYMENT.md)
