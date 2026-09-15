# 지침: 픽셀 아트 에디터 — Build 단계

## 목표
`/home/user/claude-code-playground/apps/pixel-art/spec.md`에 정의된 계획대로
16x16 픽셀 아트 에디터를 실제로 구현한다.

## 범위 제한 (중요)
- 아래 파일만 만들거나 수정한다:
  - `/home/user/claude-code-playground/apps/pixel-art/index.html`
  - `/home/user/claude-code-playground/apps/pixel-art/style.css`
  - `/home/user/claude-code-playground/apps/pixel-art/script.js`
- 그 외 파일은 절대 건드리지 않는다. 특히 블로그 루트의 `build.js`,
  `templates/`, `posts/`, `assets/`, `CLAUDE.md`, `package.json`,
  `.github/`, 그리고 다른 앱 폴더인 `apps/2048/`는 손대지 않는다.
- `spec.md`는 이미 작성되어 있으니 수정하지 않는다 (읽기만 한다).

## 구현 요구사항
`spec.md`에 정의된 내용을 그대로 구현한다. 특히:
- 16x16 격자 상태를 `grid[row][col]` 2차원 배열(hex 문자열 또는 null)로 관리
- 초기 로드 시 256개 셀을 한 번만 생성, 이후 개별 셀만 갱신(paintCell)
- 마우스 클릭/드래그, 모바일 터치(드래그 포함)로 연속 칠하기 —
  `document.elementFromPoint` 기반 공통 로직, `touch-action: none` +
  `preventDefault()`로 스크롤/확대 제스처 방지
- 프리셋 16색 팔레트 + `<input type="color">` 커스텀 색상 + 지우개 도구,
  현재 선택 상태를 시각적으로 표시
- PNG 저장: 셀당 20px로 확대한 320x320 오프스크린 캔버스에 `fillRect`로
  직접 그려서 저장(안티앨리어싱 없이 또렷하게), 빈 칸은 투명 처리,
  `toBlob` + `<a download>`로 타임스탬프 포함 파일명(`pixel-art-YYYYMMDDHHMMSS.png`)
  다운로드
- 전체 지우기 버튼(`confirm()` 확인 후 초기화)
- 데스크톱(≥720px)은 격자+도구패널 좌우 배치, 모바일은 세로 배치
- 프레임워크·외부 라이브러리 없이 순수 HTML/CSS/JS (CDN도 사용하지 않음)
- 시맨틱 HTML, 다크모드는 이 앱 범위 밖(고정 라이트 팔레트)

## 완료 조건
세 파일(`index.html`, `style.css`, `script.js`)을 모두 작성하고, 실수 없이
동작하는지 스스로 눈으로 코드를 다시 검토한다(브라우저 실행 검증은 별도
Review 단계에서 진행하므로 여기서는 코드 리뷰 수준으로 충분).

작업이 끝나면 구현한 내용을 5문장 이내로 요약해서 알려줘.
