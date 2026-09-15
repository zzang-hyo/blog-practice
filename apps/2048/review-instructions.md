# 지침: 2048 게임 — Review 단계

## 목표
`/home/user/claude-code-playground/apps/2048/`에 구현된 2048 게임이
`spec.md`대로 정상 동작하는지 브라우저에서 실제로 검증하고,
`/home/user/claude-code-playground/apps/2048/review.md`를 작성한다.

## 범위 제한 (중요)
- 검증 대상: `apps/2048/index.html`, `apps/2048/style.css`, `apps/2048/game.js`
- 문제를 발견하면 **이 세 파일 안에서만** 직접 고친다. 그 외 파일
  (블로그 루트의 `build.js`, `templates/`, `posts/`, `assets/`,
  `CLAUDE.md` 등)은 절대 건드리지 않는다.
- 새 파일은 `review.md` 하나만 만든다.

## 검증 방법
1. `apps/2048/spec.md`의 "## 7. 테스트 계획 (Review 단계 체크리스트)"
   항목을 그대로 체크리스트로 사용한다.
2. 코드를 먼저 읽어 명백한 버그가 있는지 확인한다 (예: merge 로직이
   한 이동에서 타일을 두 번 합치는지, 승리/패배 조건 로직 등).
3. 브라우저로 실제 동작을 검증한다:
   - `cd apps/2048 && python3 -m http.server 8091` 등으로 정적 서버 실행
   - Playwright(Chromium)로 페이지를 열어 확인:
     - 초기 로드 시 타일 2개 생성, 콘솔 에러 없는지
     - 방향키 4방향 입력 시 타일이 밀리고 합쳐지는지 (`page.keyboard.press`)
     - 점수가 올라가는지, `localStorage`의 `2048-best-score`가 갱신/유지되는지
     - 새 게임 버튼 동작
     - 모바일 뷰포트(375px)에서 레이아웃이 깨지지 않는지, 가로 스크롤 없는지
   - 필요하면 게임 로직 자체(merge 규칙 등)는 game.js의 함수를 Node로
     직접 호출해 유닛 테스트하듯 검증해도 좋다 (이미 Build 단계에서
     일부 확인했다면 중복 검증 대신 결과를 재확인하는 수준으로).
4. 문제를 발견하면 해당 파일을 직접 수정하고, 수정 후 다시 검증한다.

## review.md에 포함할 내용
- spec.md의 체크리스트 각 항목에 대해 PASS/FAIL 표시
- 발견한 문제와 수정 내역 (수정했다면 무엇을 어떻게 고쳤는지)
- 최종 결론: 배포(Embed 단계로 진행) 가능한 상태인지 여부

## 완료 조건
`review.md` 작성 후, 최종 결과(정상 동작 여부, 수정한 게 있다면 무엇인지)를
5문장 이내로 요약해서 알려줘.
