# 지침: 2048 게임 — Build 단계

## 목표
`/home/user/claude-code-playground/apps/2048/spec.md`에 정의된 계획대로
2048 게임을 실제로 구현한다.

## 범위 제한 (중요)
- 아래 파일만 만들거나 수정한다:
  - `/home/user/claude-code-playground/apps/2048/index.html`
  - `/home/user/claude-code-playground/apps/2048/style.css`
  - `/home/user/claude-code-playground/apps/2048/game.js`
- 그 외 파일은 절대 건드리지 않는다. 특히 블로그 루트의 `build.js`,
  `templates/`, `posts/`, `assets/`, `CLAUDE.md`, `package.json`,
  `.github/` 등은 손대지 않는다.
- `spec.md`는 이미 작성되어 있으니 수정하지 않는다 (읽기만 한다).

## 구현 요구사항
`spec.md`에 정의된 내용을 그대로 구현한다. 특히:
- 4x4 그리드, 왼쪽 밀기 로직을 reverse/transpose로 4방향에 재사용
- 한 번의 이동에서 타일 하나는 최대 한 번만 합쳐짐
- 이동 후 빈 칸에 90%/10% 확률로 2 또는 4 타일 생성
- 승리(2048 타일 등장)/패배(빈 칸 없음 + 합칠 쌍 없음) 오버레이
- 점수판: 현재 점수 + 최고 점수(`localStorage` 키 `2048-best-score`)
- 방향키 입력(스크롤 방지) + 모바일 터치 스와이프(임계값 30px)
- 새 게임 버튼
- 프레임워크·외부 라이브러리 없이 순수 HTML/CSS/JS (CDN도 사용하지 않음)
- 시맨틱 HTML, 모바일에서도 잘 보이는 반응형 레이아웃

## 완료 조건
세 파일(`index.html`, `style.css`, `game.js`)을 모두 작성하고, 실수 없이
동작하는지 스스로 눈으로 코드를 다시 검토한다(브라우저 실행 검증은 별도
Review 단계에서 진행하므로 여기서는 코드 리뷰 수준으로 충분).

작업이 끝나면 구현한 내용을 5문장 이내로 요약해서 알려줘.
