# Decisions

- 초기 저장소는 README만 포함한다. 구현은 격리 작업 트리에 둔다.
- 파일·실행 데이터 수명은 세션으로 제한하고, 설정과 워크플로 정의만 IndexedDB에 저장한다.
- 입력 연결은 단일 공급자로 제한하며 이미지, PDF, binary를 file 입력으로 전달할 수 있다.
- ZIP/PDF 라이브러리는 해당 도구를 구현하는 후속 단계에서 도입한다.

- Safari 계열의 WebP Canvas 인코더가 요청을 PNG로 대체하는 경우 jSquash를 사용한다. 1.5.0의 패키지 라이선스는 Apache-2.0이고 libwebp는 BSD-3-Clause다. 빌드에서 두 라이선스를 정적 자산으로 제공한다. 브라우저 기본 인코더가 지원하는 경우 WASM은 내려받지 않는다.
- jSquash는 Squoosh에서 파생된 브라우저/Worker 대상 패키지다. npm 공개 수정 일자는 2025-08-11이며, 도입 시 전체 npm 감사 결과는 0건이다. 순수 Canvas만 사용하는 구성은 WebKit에서 WebP 파일을 생성하지 못했다. 인코딩에만 사용하는 WASM은 약 281~346 kB이며 브라우저당 한 버전만 내려받는다.
- 도구별 고유 URL, 동적 제목·설명, 예제, FAQ, 관련 도구, 빌드 시 sitemap을 제공한다. 도구 콘텐츠는 클라이언트에서 렌더링한다. 사전 렌더링 도입은 검색 노출을 실제 도메인에서 측정한 뒤 판단한다.
- 첫 보안 감사에서 확인한 개발용 `glob` 및 `minimatch` 권고는 검증된 수정 버전으로 잠갔다. 사용 중인 최상위 도구가 수정 버전을 요구하도록 갱신되면 해당 오버라이드를 재검토한다.

[jSquash upstream](https://github.com/jamsinclair/jSquash/blob/main/README.md)
