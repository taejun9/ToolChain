import { computed } from 'vue'
import { useSettings } from './storage/settings'

const messages: Record<string, [string, string]> = {
  home: ['Home', '홈'],
  tools: ['Tools', '도구'],
  editor: ['Workflow Editor', '워크플로 편집기'],
  templates: ['Templates', '템플릿'],
  workflows: ['My Workflows', '내 워크플로'],
  settings: ['Settings', '설정'],
  hero: ['Every Tool. One Workflow.', '모든 도구를 하나의 워크플로로.'],
  tagline: [
    'Transform files and data right in your browser. Connect your favorite tools into a workflow you can run again.',
    '브라우저에서 파일과 데이터를 변환하세요. 자주 쓰는 도구를 연결해 워크플로로 다시 실행할 수 있습니다.',
  ],
  search: ['Search tools', '도구 검색'],
  all: ['All', '전체'],
  popular: ['Popular tools', '인기 도구'],
  categories: ['Categories', '카테고리'],
  recent: ['Recently used', '최근 사용'],
  favorites: ['Favorites', '즐겨찾기'],
  private: ['Local and private', '로컬에서 안전하게'],
  privateDesc: [
    'Your files stay on this device.',
    '파일은 이 기기에만 남습니다.',
  ],
  free: ['Free to use', '무료 사용'],
  freeDesc: [
    'Open a tool and get straight to work.',
    '원하는 도구를 열고 바로 작업하세요.',
  ],
  reusable: ['Reusable workflows', '재사용 가능한 워크플로'],
  reusableDesc: [
    'Connect tools and save the steps locally.',
    '도구를 연결하고 작업 순서를 기기에 저장하세요.',
  ],
  'cat.input': ['Input', '입력'],
  'cat.output': ['Output', '출력'],
  'cat.text': ['Text', '텍스트'],
  'cat.json': ['JSON', 'JSON'],
  'cat.csv': ['CSV', 'CSV'],
  'cat.image': ['Image', '이미지'],
  'cat.file': ['File', '파일'],
  input: ['Input', '입력'],
  output: ['Result', '결과'],
  config: ['Configuration', '설정'],
  execute: ['Run', '실행'],
  cancel: ['Cancel', '취소'],
  copy: ['Copy', '복사'],
  copied: ['Copied', '복사됨'],
  download: ['Download', '다운로드'],
  favorite: ['Add to favorites', '즐겨찾기 추가'],
  unfavorite: ['Remove from favorites', '즐겨찾기 제거'],
  usage: ['How to use', '사용 방법'],
  usageText: [
    'Provide the input, adjust the settings, then select Run. Copy or download your result below.',
    '입력을 제공하고 설정을 확인한 뒤 실행하세요. 아래에서 결과를 복사하거나 다운로드할 수 있습니다.',
  ],
  example: ['Example', '예시'],
  faq: ['FAQ', '자주 묻는 질문'],
  faqQuestion: ['Is my data uploaded?', '데이터가 업로드되나요?'],
  related: ['Related tools', '관련 도구'],
  none: ['No results', '결과 없음'],
  add: ['Add node', '노드 추가'],
  nodes: ['Nodes', '노드'],
  graph: ['Workflow canvas', '워크플로 캔버스'],
  selectNode: [
    'Select a node to edit its settings.',
    '설정을 편집할 노드를 선택하세요.',
  ],
  save: ['Save', '저장'],
  saved: ['Workflow saved', '워크플로 저장됨'],
  name: ['Workflow name', '워크플로 이름'],
  untitled: ['Untitled workflow', '제목 없는 워크플로'],
  remove: ['Remove node', '노드 제거'],
  connect: ['Connect', '연결'],
  source: ['Source port', '출력 포트'],
  target: ['Target port', '입력 포트'],
  choose: ['Select…', '선택…'],
  links: ['Connections', '연결 목록'],
  unlink: ['Remove connection', '연결 제거'],
  logs: ['Run log', '실행 로그'],
  progress: ['Progress', '진행률'],
  complete: ['Run complete', '실행 완료'],
  failed: ['Run ended with errors', '오류와 함께 실행 종료'],
  stopped: ['Run cancelled', '실행 취소됨'],
  runtime: ['Run input', '실행 입력'],
  limits: [
    'Files up to 40 MiB. Text up to 5 million characters.',
    '파일은 최대 40 MiB, 텍스트는 최대 500만 자입니다.',
  ],
  clone: ['Duplicate', '복제'],
  open: ['Open', '열기'],
  rename: ['Rename', '이름 변경'],
  delete: ['Delete', '삭제'],
  import: ['Import JSON', 'JSON 가져오기'],
  export: ['Export JSON', 'JSON 내보내기'],
  empty: ['No saved workflows yet.', '저장된 워크플로가 없습니다.'],
  confirmDelete: ['Delete this workflow?', '이 워크플로를 삭제할까요?'],
  reset: ['Clear local data', '로컬 데이터 초기화'],
  confirmReset: [
    'Clear saved workflows and preferences on this device?',
    '이 기기의 저장된 워크플로와 환경설정을 초기화할까요?',
  ],
  cleared: ['Local data cleared', '로컬 데이터 초기화 완료'],
  language: ['Language', '언어'],
  theme: ['Theme', '테마'],
  system: ['System', '시스템'],
  light: ['Light', '라이트'],
  dark: ['Dark', '다크'],
  storage: ['Storage usage', '저장 공간 사용량'],
  unavailable: ['Unavailable', '확인할 수 없음'],
  new: ['New workflow', '새 워크플로'],
  generate: ['Generate workflow', '워크플로 생성'],
  prompt: ['Describe your workflow', '원하는 워크플로 설명'],
  promptHint: [
    'Try “Resize image to 1200px and convert to WebP”, “Format JSON”, or “Convert CSV to JSON”.',
    '“이미지를 1200px로 줄이고 WebP로 변환해줘”, “JSON 정리”, “CSV를 JSON으로 변환”을 입력해 보세요.',
  ],
  replaceDraft: [
    'Replace the current draft?',
    '현재 편집 내용을 새 워크플로로 바꿀까요?',
  ],
  browse: ['Browse tools', '도구 둘러보기'],
  skip: ['Skip to content', '본문으로 건너뛰기'],
  notFound: ['Page not found', '페이지를 찾을 수 없습니다'],
  bytes: ['bytes', '바이트'],
  type: ['Type', '타입'],
  file: ['File', '파일'],
  idle: ['Idle', '대기'],
  queued: ['Queued', '대기열'],
  running: ['Running', '실행 중'],
  success: ['Success', '성공'],
  error: ['Error', '오류'],
  cancelled: ['Cancelled', '취소됨'],
  'field.find': ['Find', '찾을 문자열'],
  'field.replacement': ['Replacement', '바꿀 문자열'],
  'field.all': ['Replace all', '모두 바꾸기'],
  'field.separator': ['Separator', '구분자'],
  'field.indent': ['Indentation', '들여쓰기'],
  'field.path': ['Field path (dot-separated)', '필드 경로(점으로 구분)'],
  'field.delimiter': ['Delimiter', '구분자'],
  'field.headers': ['First row is a header', '첫 행을 헤더로 사용'],
  'field.width': ['Width (px)', '너비(px)'],
  'field.format': ['Format', '형식'],
  'field.quality': ['Quality (0–1)', '품질(0~1)'],
  'field.filename': ['Filename', '파일 이름'],
  auto: ['Automatic', '자동'],
  tab: ['Tab', '탭'],
  'error.invalid-input': [
    'Check the input type and enter a value for each required field.',
    '입력 타입을 확인하고 필수 입력을 채우세요.',
  ],
  'error.invalid-output': [
    'The tool returned an invalid result.',
    '도구가 유효하지 않은 결과를 반환했습니다.',
  ],
  'error.invalid-config': [
    'Review the node or tool settings.',
    '노드 또는 도구 설정을 확인하세요.',
  ],
  'error.invalid-json': [
    'Enter valid JSON. Check quotes, commas and brackets.',
    '유효한 JSON을 입력하세요. 따옴표, 쉼표, 괄호를 확인하세요.',
  ],
  'error.invalid-csv': [
    'Check CSV quoting, unique headers, and column counts.',
    'CSV 따옴표, 헤더의 중복, 열 수를 확인하세요.',
  ],
  'error.invalid-image': [
    'Choose a valid raster image whose format matches its contents.',
    '실제 내용과 형식이 일치하는 이미지 파일을 선택하세요.',
  ],
  'error.image-unsupported': [
    'This browser cannot encode the selected image format.',
    '이 브라우저에서 선택한 이미지 형식으로 변환할 수 없습니다.',
  ],
  'error.missing-field': [
    'Check the JSON field path.',
    'JSON 필드 경로를 확인하세요.',
  ],
  'error.missing-input': [
    'Connect or provide the required input.',
    '필수 입력을 연결하거나 값을 입력하세요.',
  ],
  'error.missing-port': [
    'The connection references a missing node or port.',
    '연결에 지정한 노드 또는 포트가 없습니다.',
  ],
  'error.incompatible-port': [
    'These ports have incompatible data types.',
    '두 포트의 데이터 타입이 호환되지 않습니다.',
  ],
  'error.occupied-port': [
    'This input already has a connection.',
    '이미 연결된 입력 포트입니다.',
  ],
  'error.cycle': [
    'Remove a connection to break the cycle.',
    '순환을 만드는 연결을 제거하세요.',
  ],
  'error.duplicate-id': [
    'Node and connection IDs must be unique.',
    '노드와 연결 ID는 고유해야 합니다.',
  ],
  'error.unknown-tool': [
    'This workflow references an unavailable tool.',
    '워크플로가 지원되지 않는 도구를 참조합니다.',
  ],
  'error.unsupported-version': [
    'This tool version is unsupported.',
    '지원되지 않는 도구 버전입니다.',
  ],
  'error.invalid-workflow': [
    'Choose a valid ToolChain workflow JSON (schema version 1).',
    '유효한 ToolChain 워크플로 JSON(스키마 버전 1)을 선택하세요.',
  ],
  'error.too-large': [
    'The file, text, image, or result exceeds the processing limit.',
    '파일, 텍스트, 이미지 또는 결과가 처리 한도를 초과했습니다.',
  ],
  'error.processing': [
    'The operation failed. Check the input and try again.',
    '작업에 실패했습니다. 입력을 확인한 뒤 다시 시도하세요.',
  ],
  'error.storage': [
    'Local storage is unavailable or full.',
    '로컬 저장소를 사용할 수 없거나 공간이 부족합니다.',
  ],
  'error.upstream': [
    'Skipped because an upstream step failed.',
    '이전 단계가 실패해 실행을 건너뛰었습니다.',
  ],
  'error.unsupported-prompt': [
    'This request is outside the supported commands. Try one of the examples.',
    '지원 범위를 벗어난 요청입니다. 예시 중 하나를 시도하세요.',
  ],
  'error.empty-workflow': [
    'Add at least one node before running.',
    '실행 전에 노드를 하나 이상 추가하세요.',
  ],
}
Object.assign(messages, {
  'cat.pdf': ['PDF', 'PDF'],
  'cat.zip': ['ZIP', 'ZIP'],
  'cat.flow': ['Control flow', '제어 흐름'],
  'field.first': ['First page', '시작 페이지'],
  'field.last': ['Last page', '마지막 페이지'],
  'field.match': ['Match text', '비교할 텍스트'],
  'field.mode': ['Comparison', '비교 방식'],
  parallelism: ['Concurrent steps', '동시 실행 노드 수'],
  skipped: ['Skipped', '건너뜀'],
  issues: ['Issues', '문제'],
  'log-filter': ['Filter logs', '로그 필터'],
  'export-log': ['Export run log', '실행 로그 내보내기'],
  share: ['Share template', '템플릿 공유'],
  'shared-template': ['Shared template', '공유 템플릿'],
  'share-link': ['Share link', '공유 링크'],
  'share-warning': [
    'Anyone with this link can read the workflow settings. Runtime inputs are excluded.',
    '링크를 받은 사람은 워크플로 설정을 읽을 수 있습니다. 실행 입력은 링크에 포함되지 않습니다.',
  ],
  'share-review': [
    'Review the steps and settings before you run this workflow.',
    '실행 전에 워크플로 단계와 설정을 확인하세요.',
  ],
  'error.share-too-large': [
    'This workflow is too large for a link. Export its JSON instead.',
    '링크로 공유하기에 너무 큽니다. JSON으로 내보내세요.',
  ],
  'error.branch-skipped': [
    'The condition did not select this branch.',
    '조건이 이 경로를 선택하지 않았습니다.',
  ],
  'error.invalid-pdf': [
    'Choose a valid, unencrypted PDF.',
    '유효하고 암호화되지 않은 PDF를 선택하세요.',
  ],
  'error.page-range': [
    'Choose a valid one-based page range.',
    '1부터 시작하는 유효한 페이지 범위를 입력하세요.',
  ],
  'error.invalid-zip': [
    'Choose a valid, nonempty ZIP archive.',
    '유효하고 비어 있지 않은 ZIP을 선택하세요.',
  ],
  'error.archive-name': [
    'Check for duplicate filenames or unsafe archive paths.',
    '중복 파일 이름이나 안전하지 않은 압축 경로를 확인하세요.',
  ],
})

const toolNames: Record<string, [string, string, string, string]> = {
  'input.files': [
    'Multiple File Input',
    '여러 파일 입력',
    'Select files for batch processing.',
    '일괄 처리할 파일을 선택합니다.',
  ],
  'input.pdf': [
    'PDF Input',
    'PDF 입력',
    'Select a local PDF.',
    '로컬 PDF를 선택합니다.',
  ],
  'pdf.merge': [
    'PDF Merge',
    'PDF 병합',
    'Combine pages from multiple PDFs in file order.',
    '선택한 PDF의 페이지를 파일 순서대로 합칩니다.',
  ],
  'pdf.extract': [
    'PDF Extract Pages',
    'PDF 페이지 추출',
    'Save an inclusive page range as a new PDF.',
    '지정한 페이지 범위를 새 PDF로 저장합니다.',
  ],
  'zip.pack': [
    'ZIP Pack',
    'ZIP 압축',
    'Compress multiple local files into a ZIP.',
    '여러 로컬 파일을 ZIP으로 압축합니다.',
  ],
  'zip.unpack': [
    'ZIP Extract',
    'ZIP 압축 풀기',
    'Extract and download individual archive entries.',
    '압축을 풀고 파일을 개별 다운로드합니다.',
  ],
  'flow.condition': [
    'Text Condition',
    '텍스트 조건',
    'Route text to one of two ports based on a comparison.',
    '텍스트 비교 결과에 따라 두 포트 중 하나로 전달합니다.',
  ],
  'input.text': [
    'Text Input',
    '텍스트 입력',
    'Enter text for the next step.',
    '다음 단계에 전달할 텍스트를 입력합니다.',
  ],
  'input.file': [
    'File Input',
    '파일 입력',
    'Select a local file.',
    '로컬 파일을 선택합니다.',
  ],
  'input.image': [
    'Image Input',
    '이미지 입력',
    'Select a local raster image.',
    '로컬 래스터 이미지를 선택합니다.',
  ],
  'text.replace': [
    'Text Replace',
    '텍스트 바꾸기',
    'Replace literal text within a string.',
    '문자열에서 지정한 텍스트를 바꿉니다.',
  ],
  'text.split': [
    'Text Split',
    '텍스트 나누기',
    'Split text into a JSON array.',
    '텍스트를 나눠 JSON 배열로 만듭니다.',
  ],
  'json.parse': [
    'JSON Parse',
    'JSON 파싱',
    'Parse and validate JSON text.',
    'JSON 텍스트를 파싱하고 검증합니다.',
  ],
  'json.format': [
    'JSON Format',
    'JSON 포맷',
    'Format JSON with readable indentation.',
    '읽기 쉬운 들여쓰기로 JSON을 정리합니다.',
  ],
  'json.extract': [
    'JSON Extract',
    'JSON 필드 추출',
    'Extract a field using a dot-separated path.',
    '점으로 구분한 경로로 JSON 필드를 추출합니다.',
  ],
  'csv.parse': [
    'CSV Parse',
    'CSV 파싱',
    'Parse quoted CSV into rows.',
    '따옴표를 포함한 CSV를 행 단위로 파싱합니다.',
  ],
  'csv.to-json': [
    'CSV to JSON',
    'CSV를 JSON으로',
    'Convert CSV rows into JSON.',
    'CSV 행을 JSON으로 변환합니다.',
  ],
  'image.resize': [
    'Image Resize',
    '이미지 크기 조절',
    'Resize an image while preserving its aspect ratio.',
    '종횡비를 유지하며 이미지 크기를 조절합니다.',
  ],
  'image.convert': [
    'Image Convert',
    '이미지 형식 변환',
    'Encode an image as PNG, JPEG, or WebP.',
    '이미지를 PNG, JPEG 또는 WebP로 변환합니다.',
  ],
  'output.text': [
    'Text Output',
    '텍스트 출력',
    'Preview, copy, or download text.',
    '텍스트를 미리 보고 복사하거나 다운로드합니다.',
  ],
  'file.download': [
    'File Download',
    '파일 다운로드',
    'Prepare a local file for download.',
    '다운로드할 로컬 파일을 준비합니다.',
  ],
}
for (const [id, [en, ko, descEn, descKo]] of Object.entries(toolNames)) {
  messages['tool.' + id] = [en, ko]
  messages['desc.' + id] = [descEn, descKo]
}
const templates = [
  [
    'optimizer',
    'Web Image Optimizer',
    '웹 이미지 최적화',
    'Resize to 1200 px and encode as WebP.',
    '너비를 1200px로 줄이고 WebP로 변환합니다.',
  ],
  [
    'converter',
    'Image Format Converter',
    '이미지 형식 변환',
    'Convert an image to WebP.',
    '이미지를 WebP로 변환합니다.',
  ],
  [
    'formatter',
    'JSON Formatter',
    'JSON 포매터',
    'Parse JSON and apply readable indentation.',
    'JSON을 파싱하고 들여쓰기를 적용합니다.',
  ],
  [
    'extractor',
    'JSON Field Extractor',
    'JSON 필드 추출기',
    'Extract a field from a JSON document.',
    'JSON 문서에서 필드를 추출합니다.',
  ],
  [
    'csv',
    'CSV to JSON Converter',
    'CSV-JSON 변환기',
    'Turn CSV rows into JSON objects.',
    'CSV 행을 JSON 객체로 변환합니다.',
  ],
  [
    'cleaner',
    'Text Cleaner',
    '텍스트 정리',
    'Replace a specified literal throughout text.',
    '지정한 문자열을 텍스트 전체에서 바꿉니다.',
  ],
]
for (const [id, en, ko, descEn, descKo] of templates) {
  messages['template.' + id] = [en, ko]
  messages['templateDesc.' + id] = [descEn, descKo]
}

export function useI18n() {
  const settings = useSettings()
  const t = (key: string) =>
    messages[key]?.[settings.language === 'ko' ? 1 : 0] ?? key
  return {
    t,
    locale: computed(() => settings.language),
    describeError: (code: string) =>
      t('error.' + (messages['error.' + code] ? code : 'processing')),
  }
}
