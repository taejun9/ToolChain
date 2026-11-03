# Architecture

Vue Router는 화면을 지연 로드한다. Pinia와 Dexie는 설정과 저장 목록을 관리한다. core는 UI 및 DB와 독립적이며 tools는 Zod 설정과 실행기를 등록한다. 기능별 화면과 공통 폼은 features와 components에 배치한다. 작은 초기 규모에 맞춰 비어 있는 계층별 디렉터리를 생성하지 않는다.

편집기에서 Workflow와 실행 입력을 별도 상태로 관리한다. 템플릿과 규칙 파서는 동일한 워크플로 스키마를 사용한다. Pinia는 사용자 설정을 관리하며 Dexie v1에는 워크플로 정의와 환경설정을 분리해 저장한다.

경로별 동적 import로 Vue Flow를 편집기에 한정한다. 이미지와 구조화 데이터 작업은 종료 가능한 모듈 Worker에서 처리한다. Papa Parse는 CSV 작업에 한해 로드한다. Canvas가 WebP를 인코딩할 수 없는 브라우저에서만 jSquash 인코더를 로드한다.

광고 컴포넌트는 `adPlacements` 주입 키로 홈, 도구 상세, 템플릿 목록에만 연결할 수 있다. 기본 앱은 컴포넌트를 제공하지 않아 별도의 영역이 렌더링되지 않는다.
