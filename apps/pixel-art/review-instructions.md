# 지침: 픽셀 아트 에디터 — Review 단계

## 목표
`/home/user/claude-code-playground/apps/pixel-art/`에 구현된 픽셀 아트
에디터가 `spec.md`대로 정상 동작하는지 브라우저에서 실제로 검증하고,
`/home/user/claude-code-playground/apps/pixel-art/review.md`를 작성한다.

## 범위 제한 (중요)
- 검증 대상: `apps/pixel-art/index.html`, `apps/pixel-art/style.css`,
  `apps/pixel-art/script.js`
- 문제를 발견하면 **이 세 파일 안에서만** 직접 고친다. 그 외 파일
  (블로그 루트의 `build.js`, `templates/`, `posts/`, `assets/`,
  `CLAUDE.md`, 다른 앱 폴더 `apps/2048/` 등)은 절대 건드리지 않는다.
- 새 파일은 `review.md` 하나만 만든다.

## 검증 방법
1. `apps/pixel-art/spec.md`의 "## 8. 테스트 계획 (Review 단계 체크리스트)"
   항목을 그대로 체크리스트로 사용한다.
2. 코드를 먼저 읽어 명백한 버그가 있는지 확인한다 (예: 드래그 중 셀 누락,
   지우개/색상 전환 로직, PNG export 캔버스 크기·투명 처리 등).
3. 브라우저로 실제 동작을 검증한다:
   - `cd apps/pixel-art && python3 -m http.server 8092` 등으로 정적 서버 실행
   - Playwright(Chromium)로 페이지를 열어 확인 (전역 설치본이므로
     `NODE_PATH=$(npm root -g) node 스크립트.js`로 실행):
     - 클릭으로 칠해지는지, 마우스 드래그로 여러 칸이 연속으로 칠해지는지
       (`page.mouse.down/move/up` 사용)
     - 프리셋 스와치 클릭 시 선택 색이 바뀌고 시각적 표시가 갱신되는지
     - 지우개로 칠해진 칸을 지울 수 있는지
     - "PNG로 저장" 클릭 시 다운로드 이벤트가 발생하는지
       (`page.waitForEvent('download')`), 파일명이 `pixel-art-`로 시작하는지
     - "전체 지우기" 클릭 시 `confirm()` 다이얼로그가 뜨는지
       (`page.on('dialog', ...)`으로 처리) 및 확인 후 격자가 비워지는지
     - 모바일 뷰포트(375px)에서 레이아웃이 세로로 배치되고 가로 스크롤이
       없는지, 터치 이벤트(`page.touchscreen` 또는 dispatchEvent로 touch
       이벤트 시뮬레이션)로 그리기가 되는지
     - 콘솔 에러 확인
4. 문제를 발견하면 해당 파일을 직접 수정하고, 수정 후 다시 검증한다.

## review.md에 포함할 내용
- spec.md의 체크리스트 각 항목에 대해 PASS/FAIL 표시
- 발견한 문제와 수정 내역 (수정했다면 무엇을 어떻게 고쳤는지)
- 최종 결론: 배포(Embed 단계로 진행) 가능한 상태인지 여부

## 완료 조건
`review.md` 작성 후, 최종 결과(정상 동작 여부, 수정한 게 있다면 무엇인지)를
5문장 이내로 요약해서 알려줘.
