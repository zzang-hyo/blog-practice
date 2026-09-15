# 픽셀 아트 에디터 미니 웹앱 — 구현 계획 (spec.md)

## 1. 파일 구조

```
/apps/pixel-art/
├── index.html   # 페이지 구조, 격자/팔레트/도구 버튼 DOM, CSS·JS 링크
├── style.css    # 레이아웃, 격자 스타일, 팔레트 스타일, 반응형
├── script.js    # 격자 상태, 그리기(마우스/터치) 처리, 팔레트/지우개, PNG 저장, 전체 지우기
└── spec.md      # 본 계획 문서 (Plan 단계 산출물)
```

- 프레임워크·외부 라이브러리 없음. CDN도 사용하지 않음(이 규모의 에디터에 불필요).
- 블로그 루트의 `build.js`, `templates/`, `posts/`, `assets/`, `index.html`(블로그 메인) 등은 건드리지 않는다. `/apps/pixel-art/` 폴더는 그 자체로 완결되어 `index.html`을 브라우저에서 바로 열거나 정적 서빙만으로 동작해야 한다.
- `index.html`에서 블로그 메인으로 돌아가는 "← 블로그로" 링크는 넣을 수 있으나(선택), 블로그 쪽 파일 수정은 Embed 단계에서만 진행한다.
- 이번 Plan 단계에서는 코드를 작성하지 않는다. 위 파일 구조는 Build 단계에서 만들 파일 목록을 미리 정의해둔 것이다.

## 2. 16x16 격자 표현 방법

### 2.1 상태 저장 (script.js)

- 16x16 2차원 배열로 각 칸의 색상을 저장한다.

```js
const GRID_SIZE = 16;
// grid[row][col] : 칠해진 색이면 "#rrggbb" 형태의 문자열, 빈 칸(지워진 칸)이면 null
let grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
```

- `null`은 "빈 칸(투명/미채색)"을 의미한다. 문자열이면 항상 `#rrggbb` 형식의 hex 색상 코드로 통일한다(프리셋 스와치 값도, `<input type="color">` 값도 모두 이 형식이므로 별도 변환이 필요 없다).
- 별도의 undo 스택 등은 이번 범위에 포함하지 않는다(요구사항에 없음, 필요시 향후 개선 사항으로 남김).

### 2.2 DOM 렌더링 방식

- `index.html`에 컨테이너 `<div id="pixel-grid" class="pixel-grid" role="grid" aria-label="16x16 픽셀 캔버스"></div>`를 둔다.
- 페이지 로드 시 JS로 16×16 = 256개의 `<button type="button" class="pixel-cell" data-row="R" data-col="C" tabindex="-1"></button>` 요소를 `document.createElement`로 생성해 `#pixel-grid`에 한 번만 append한다(문자열 template literal로 256개를 이어붙이는 대신 반복문 + `createElement`/`DocumentFragment` 사용 — 가독성과 이후 개별 셀 이벤트 바인딩이 쉬움).
  - `<button>`을 쓰는 이유: 키보드 포커스 가능성과 시맨틱(클릭 가능한 요소임을 명시)을 확보하되, `tabindex="-1"`로 Tab 이동 시 256번 정지하는 것은 막는다(그리기는 마우스/터치 중심 상호작용이므로).
- CSS: `#pixel-grid { display: grid; grid-template-columns: repeat(16, 1fr); grid-template-rows: repeat(16, 1fr); aspect-ratio: 1 / 1; width: min(480px, 94vw); }`. 정사각형을 유지하며 화면 크기에 맞춰 자동 축소된다(16×480px 기준 셀 한 변 = 30px 내외).
- 빈 칸 표시: 격자 배경에 8px 단위의 연한 체커보드 패턴(`background-image: repeating conic-gradient` 또는 두 개의 `linear-gradient`를 45° 오프셋으로 조합)을 적용해 "빈 칸 = 투명"임을 시각적으로 알 수 있게 한다. 칠해진 칸은 `pixel-cell` 요소의 `style.backgroundColor`가 체커보드 위를 덮으므로 자연스럽게 구분된다.
- 렌더링 갱신 전략: 매 상호작용마다 256개 셀 전체를 다시 그리지 않는다. 아래 `paintCell(row, col, color)` 함수가 상태 배열과 해당 셀의 `style.backgroundColor`만 직접 갱신한다. 전체 재렌더(`renderAll()`)는 초기 로드, 전체 지우기(Clear) 시에만 호출한다.

```js
function paintCell(row, col, color) {
  grid[row][col] = color; // color는 hex 문자열 또는 null(지우개)
  const cell = cellElements[row][col]; // 2차원 참조 배열(초기 렌더 시 채워둠)
  cell.style.backgroundColor = color || "transparent";
}
```

- `cellElements`는 초기 렌더링 시 생성한 256개 `<button>` DOM 참조를 `grid`와 동일한 [row][col] 구조로 보관하는 2차원 배열이다. `data-row`/`data-col` 속성을 `querySelector`로 매번 찾지 않고 O(1)로 접근하기 위함이다.

## 3. 그리기 상호작용

### 3.1 공통 원칙

- 전역 상태 `let isDrawing = false;`로 "현재 마우스/손가락을 누른 채 그리는 중"인지 추적한다.
- 마우스와 터치 모두 "누른 좌표 아래의 셀을 실시간으로 찾아 칠한다" 방식을 채택한다. 개별 셀에 `mouseenter` 리스너를 다는 방식은 터치에서 동작하지 않으므로(터치는 `touchmove` 이벤트의 `target`이 터치 시작 시점의 요소로 고정됨 — 손가락이 이동해도 이벤트 타겟이 바뀌지 않음) 마우스/터치 공통으로 쓸 수 있는 방식을 사용한다.
- 좌표 → 셀 변환 헬퍼:

```js
function getCellFromPoint(clientX, clientY) {
  const el = document.elementFromPoint(clientX, clientY);
  if (!el || !el.classList.contains("pixel-cell")) return null;
  return { row: Number(el.dataset.row), col: Number(el.dataset.col) };
}
```

### 3.2 마우스 클릭/드래그

- `#pixel-grid`에 `mousedown`, `mousemove` 리스너를 등록하고, `mouseup`은 `window`(document) 레벨에 등록한다(그리드 밖에서 버튼을 놓아도 `isDrawing`이 확실히 해제되도록).
- `mousedown`: 클릭된 셀을 `getCellFromPoint`로 찾아 즉시 `paintCell` 호출(단일 클릭으로도 칠해짐), `isDrawing = true`로 설정.
- `mousemove`: `isDrawing`이 true일 때만 `getCellFromPoint`로 현재 좌표의 셀을 찾아 `paintCell` 호출. 이전에 칠한 셀과 같으면 같은 색을 다시 대입해도 무해하므로 별도 중복 체크는 하지 않아도 되지만, 성능을 위해 "직전에 칠한 셀과 동일하면 스킵"하는 최적화(`lastPaintedCell` 캐시)를 넣는다.
- `mouseup`(window): `isDrawing = false`.
- 기본 브라우저 동작(이미지 드래그, 텍스트 선택) 방지를 위해 `#pixel-grid { user-select: none; }`와 각 셀에 `draggable="false"` 속성을 부여하고, `dragstart` 이벤트는 `preventDefault()`.

### 3.3 모바일 터치

- `#pixel-grid`에 `touchstart`, `touchmove` 리스너를 등록한다(touchend는 그리기 종료만 처리하면 되므로 grid에 두거나 window에 둬도 무방하지만, 일관성을 위해 grid에 등록).
- `touchstart`: `event.preventDefault()`를 호출해 스크롤/확대 제스처가 시작되지 않도록 막는다. `event.touches[0].clientX/clientY`로 `getCellFromPoint` 호출 후 `paintCell`, `isDrawing = true`.
- `touchmove`: `event.preventDefault()` 호출(스크롤 방지) 후 `event.touches[0].clientX/clientY`로 현재 셀을 찾아 `paintCell`.
- `touchend`/`touchcancel`: `isDrawing = false`.
- CSS로 이중 안전장치: `#pixel-grid { touch-action: none; }`를 지정해, 그리드 영역 안에서는 브라우저가 스크롤/핀치줌 제스처를 아예 가로채지 않도록 한다(`preventDefault()`만으로는 일부 브라우저에서 스크롤이 완전히 막히지 않는 경우가 있어 `touch-action: none`을 함께 사용).
- 그리드 바깥(팔레트, 버튼 영역)은 `touch-action` 기본값을 유지해 페이지 스크롤이 정상 동작하도록 한다.

### 3.4 지우개 모드에서의 그리기

- 지우개가 활성화된 상태에서는 `paintCell`에 전달하는 `color` 인자가 `null`이 된다(4.4절 참고). 위의 마우스/터치 로직은 "현재 선택된 색상(`currentColor`, 지우개면 `null`)"을 그대로 `paintCell`에 넘기므로 별도 분기 없이 동일한 코드 경로로 처리된다.

## 4. 색상 팔레트

### 4.1 프리셋 스와치 (16개)

`index.html`의 `<section class="palette">` 안에 16개의 `<button class="swatch" data-color="#xxxxxx" style="background-color:#xxxxxx" aria-label="색상 이름"></button>`을 배치한다. 그레이스케일, 기본색, 보조색, 피부톤 계열을 고루 포함한 구성:

| # | 색상 | hex |
|---|---|---|
| 1 | 검정 | `#000000` |
| 2 | 흰색 | `#ffffff` |
| 3 | 회색 | `#808080` |
| 4 | 밝은 회색 | `#c0c0c0` |
| 5 | 빨강 | `#ff0000` |
| 6 | 주황 | `#ff7f00` |
| 7 | 노랑 | `#ffff00` |
| 8 | 라임(연두) | `#00ff00` |
| 9 | 진초록 | `#008000` |
| 10 | 시안(하늘색) | `#00ffff` |
| 11 | 파랑 | `#0000ff` |
| 12 | 남색 | `#000080` |
| 13 | 보라 | `#800080` |
| 14 | 마젠타/분홍 | `#ff00ff` |
| 15 | 갈색 | `#a52a2a` |
| 16 | 살구색(피부톤) | `#ffc0cb` |

- 스와치는 `.palette-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px; }`로 8열 배치(모바일에서는 미디어쿼리로 4~6열로 축소, 7절 참고).
- 각 스와치는 `width/height: 32px; border-radius: 4px;` 정도의 정사각형 버튼.

### 4.2 커스텀 색상 선택

- 팔레트 영역에 `<input type="color" id="custom-color" value="#ff0000" aria-label="커스텀 색상 선택">`을 배치한다.
- `change`(또는 `input`) 이벤트에서 `currentColor = event.target.value; setEraserActive(false); updateSelectionUI();`를 실행해 프리셋 스와치와 동일하게 취급한다.
- 커스텀 색상은 별도의 "현재 선택된 커스텀 스와치" 표시용 요소(예: `<input type="color">` 자체가 선택된 색상을 보여주므로 별도 스와치 사본은 만들지 않음)로 충분하다.

### 4.3 현재 선택된 색상 표시

- 전역 상태 `let currentColor = "#000000";`(초기값: 첫 번째 프리셋), `let eraserActive = false;`.
- 프리셋 스와치를 클릭하면: `currentColor = swatch.dataset.color; eraserActive = false;` 후 `updateSelectionUI()` 호출.
- `updateSelectionUI()`는 다음을 수행한다.
  1. 모든 `.swatch`에서 `.selected` 클래스 제거 후, `currentColor`와 `data-color`가 일치하는 스와치에만 `.selected` 추가. `.selected`는 CSS로 `outline: 3px solid #333; outline-offset: 2px;`(또는 `box-shadow`)로 시각적 강조.
  2. 지우개 버튼에는 `eraserActive` 여부에 따라 `.active` 클래스 토글(별도 강조 스타일).
  3. 팔레트 상단의 "현재 색상 미리보기" 박스(`<div id="current-color-preview">`, `width/height: 40px`)의 배경색을 `eraserActive`면 체커보드 패턴, 아니면 `currentColor`로 설정 — 어떤 도구가 선택되어 있는지 한눈에 보이게 한다.

### 4.4 지우개 도구

- `<button id="eraser-btn" class="tool-btn">지우개</button>`를 팔레트 영역에 배치(스와치들과 구분되도록 아이콘 또는 별도 스타일 부여, 예: 대각선 빗금 아이콘).
- 클릭 시: `eraserActive = true; updateSelectionUI();`. 이후 그리기 시 `paintCell(row, col, eraserActive ? null : currentColor)`가 호출되어 해당 칸이 `null`(빈 칸)로 되돌아간다.
- 프리셋 스와치나 커스텀 색상을 다시 선택하면 `eraserActive = false`로 자동 해제된다(4.1, 4.2 참고).
- 그리기 로직(3절)은 "지금 칠할 색"을 항상 `eraserActive ? null : currentColor`로 계산해 `paintCell`에 넘기므로, 지우개도 일반 색칠과 동일한 클릭/드래그/터치 코드 경로를 그대로 재사용한다.

## 5. PNG 저장 기능

### 5.1 저장용 캔버스 구성

- 화면에 보이는 16×16 DOM 격자와는 별개로, 저장 시점에 오프스크린 `<canvas>`를 코드로 생성한다(`index.html`에 미리 숨겨둔 `<canvas>`를 하나 둬도 되고, `document.createElement('canvas')`로 즉석 생성해도 됨 — 여기서는 `index.html`에 `<canvas id="export-canvas" hidden></canvas>`를 미리 선언해두는 방식을 택한다. 재사용이 쉽고 디버깅 시 요소를 직접 확인할 수 있기 때문).
- **배율: 16×16 원본을 그대로 저장하지 않고, 셀당 20px로 확대해 320×320 PNG로 저장한다.**
  - 이유 1: 16×16 원본 그대로 저장하면 대부분의 이미지 뷰어/에디터가 이를 화면에 그대로(또는 브라우저 확대 없이) 표시해 그림이 너무 작게 보인다. 확대 저장하면 다운로드 직후 바로 확인하기 편하다.
  - 이유 2: 20배율(320×320)은 SNS 공유나 프로필 이미지로 쓰기에 무난한 크기이면서도, 픽셀 하나하나가 정확히 20×20 정사각형으로 매핑되어 "각진" 픽셀 아트 느낌이 그대로 유지된다(스케일이 정수배이므로 안티앨리어싱으로 경계가 흐려질 위험이 없다).
  - 이유 3: 정수 배율(20배)을 `fillRect`로 직접 그리는 방식을 택하므로 `drawImage`의 이미지 스무딩(`imageSmoothingEnabled`) 설정을 신경 쓸 필요가 없다 — 애초에 저해상도 이미지를 확대하는 것이 아니라, 320×320 캔버스에 20×20 크기의 사각형을 256번 직접 그리는 방식이기 때문.
- 구현:

```js
const CELL_EXPORT_SIZE = 20; // px, 셀 하나를 저장 시 20x20으로 그림
function buildExportCanvas() {
  const canvas = document.getElementById("export-canvas");
  canvas.width = GRID_SIZE * CELL_EXPORT_SIZE;   // 320
  canvas.height = GRID_SIZE * CELL_EXPORT_SIZE;  // 320
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height); // 빈 칸은 투명(alpha=0)으로 남김
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const color = grid[r][c];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(c * CELL_EXPORT_SIZE, r * CELL_EXPORT_SIZE, CELL_EXPORT_SIZE, CELL_EXPORT_SIZE);
      }
      // color가 null이면 아무것도 그리지 않아 해당 영역은 투명하게 남는다.
    }
  }
  return canvas;
}
```

- 빈 칸은 `fillRect`를 호출하지 않아(캔버스 기본값이 완전 투명) 최종 PNG에서 알파 0으로 저장된다. 즉 저장된 PNG는 투명 배경의 스프라이트 이미지가 된다(일반적인 픽셀 아트/스프라이트 활용 관례와 일치). 편집 화면에서만 체커보드로 "빈 칸"을 시각화하고, 저장 결과물에는 체커보드가 포함되지 않는다.

### 5.2 다운로드 트리거

```js
function downloadPNG() {
  const canvas = buildExportCanvas();
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "");
    a.href = url;
    a.download = `pixel-art-${stamp}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, "image/png");
}
```

- `toBlob` + `URL.createObjectURL`을 `toDataURL`보다 우선 사용한다(대용량 base64 문자열을 만들지 않아 메모리 효율이 약간 더 좋음). `toBlob`을 지원하지 않는 아주 오래된 브라우저를 위한 폴백은 이번 범위에서는 생략(대상 브라우저는 최신 모바일/데스크톱으로 가정).
- 파일명은 `pixel-art-YYYYMMDDHHMMSS.png` 형식으로, 저장할 때마다 겹치지 않도록 타임스탬프를 포함한다.
- "PNG로 저장" 버튼(`<button id="save-btn">PNG로 저장</button>`)의 클릭 이벤트에서 `downloadPNG()`를 호출한다.

## 6. 전체 지우기(Clear) 기능

- `<button id="clear-btn">전체 지우기</button>`를 팔레트/도구 영역에 배치한다(실수 클릭 방지를 위해 저장 버튼과는 시각적으로 거리를 두거나 색상을 다르게 함, 예: 경고색 테두리).
- 클릭 시 `window.confirm("정말 모두 지울까요? 되돌릴 수 없습니다.")`로 확인 후 승인되면:
  1. `grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));`로 상태 초기화.
  2. `renderAll()` 호출 — 256개 셀의 `style.backgroundColor`를 모두 `transparent`로 되돌린다(3.4/5.1과 동일하게 "빈 칸 = null"이라는 동일한 표현을 그대로 재사용하므로 별도 로직이 필요 없다).
- 되돌리기(undo) 기능은 이번 범위에 포함하지 않으므로, `confirm()` 대화상자로 실수 클릭을 방지하는 것이 유일한 안전장치임을 명시한다.

## 7. UI 레이아웃 및 반응형 설계

### 7.1 시맨틱 구조 (index.html)

```
<body>
  <header>제목("픽셀 아트 에디터"), (선택) 블로그로 돌아가기 링크</header>
  <main>
    <section class="canvas-area" aria-label="그리기 영역">
      <div id="pixel-grid" role="grid">...(256 버튼)...</div>
    </section>
    <section class="tool-area" aria-label="도구">
      <div id="current-color-preview"></div>
      <div class="palette-grid">...(16 스와치)...</div>
      <input type="color" id="custom-color">
      <button id="eraser-btn">지우개</button>
      <button id="clear-btn">전체 지우기</button>
      <button id="save-btn">PNG로 저장</button>
    </section>
  </main>
  <footer>(선택) 안내 문구</footer>
</body>
```

### 7.2 데스크톱/모바일 배치

- `main`을 flex 컨테이너로: 데스크톱(뷰포트 ≥ 720px)에서는 `flex-direction: row`로 좌측에 격자(`.canvas-area`), 우측에 도구 패널(`.tool-area`)을 나란히 배치.
- 모바일(뷰포트 < 720px)에서는 `flex-direction: column`으로 전환해 격자가 위, 도구 패널(팔레트+버튼들)이 아래로 오도록 미디어쿼리 처리.
  ```css
  main { display: flex; flex-direction: row; gap: 24px; }
  @media (max-width: 720px) {
    main { flex-direction: column; align-items: center; }
    .palette-grid { grid-template-columns: repeat(4, 1fr); } /* 8열 -> 4열로 축소 */
  }
  ```
- 격자 자체는 7.3 이전(2.2)에 정의한 대로 `width: min(480px, 94vw)`이므로 별도 미디어쿼리 없이도 화면 폭에 맞춰 자동으로 줄어든다.
- 버튼(지우개/전체 지우기/PNG로 저장)은 터치 타겟을 고려해 최소 `min-height: 44px`를 확보하고, 모바일에서는 세로로 쌓이도록 `.tool-area { display: flex; flex-direction: column; gap: 12px; }`.

### 7.3 다크모드 관련

- 이 앱은 2048 앱과 마찬가지로 블로그의 다크모드 시스템(`prefers-color-scheme` 등)과 무관하게 항상 고정된 라이트 팔레트로 표시한다. 색상 팔레트 자체가 사용자가 직접 고르는 그림 도구이므로, 배경 다크모드가 있으면 오히려 실제 그린 색상 인지가 왜곡될 수 있어 이 앱 범위에서는 다크모드를 지원하지 않는 것으로 명시한다.
- 페이지 배경은 밝은 회색/오프화이트(`#f5f5f5` 등), 텍스트는 짙은 회색(`#222`)으로 고정.

## 8. 테스트 계획 (Review 단계 체크리스트)

**기본 그리기**
- [ ] 격자 칸을 한 번 클릭하면 현재 선택된 색으로 즉시 칠해진다.
- [ ] 이미 칠해진 칸을 다른 색으로 클릭하면 색이 덮어써진다.
- [ ] 콘솔에 에러/경고가 없다.

**색상 변경**
- [ ] 16개 프리셋 스와치를 각각 클릭하면 `currentColor`가 바뀌고, 이후 그리기에 해당 색이 반영된다.
- [ ] 클릭한 스와치에 선택 표시(테두리/아웃라인)가 나타나고, 다른 스와치를 클릭하면 이전 선택 표시가 사라진다.
- [ ] `<input type="color">`로 임의 색상을 고르면 해당 색이 `currentColor`가 되고, 현재 색상 미리보기에 반영된다.

**드래그로 연속 칠하기**
- [ ] 마우스 버튼을 누른 채 격자 위를 이동(드래그)하면 지나가는 모든 칸이 연속으로 칠해진다.
- [ ] 빠르게 드래그해도 중간 칸이 누락되지 않는다(`elementFromPoint` 기반이므로 프레임마다 좌표 아래 셀을 정확히 찾는지 확인).
- [ ] 격자 밖에서 마우스 버튼을 놓아도 `isDrawing`이 정상적으로 `false`가 되어, 이후 격자 밖에서 다시 움직여도 칠해지지 않는다.

**지우개**
- [ ] 지우개 버튼을 누르면 활성 상태 표시가 나타난다.
- [ ] 지우개 상태에서 칠해진 칸을 클릭/드래그하면 해당 칸이 빈 칸(투명, 체커보드 표시)으로 돌아간다.
- [ ] 지우개 활성 중 다른 색상 스와치를 클릭하면 지우개가 자동으로 해제된다.

**전체 지우기**
- [ ] "전체 지우기" 클릭 시 확인 대화상자가 뜨고, 취소하면 아무 변화가 없다.
- [ ] 확인하면 256칸이 모두 빈 칸으로 초기화된다.

**PNG 저장**
- [ ] "PNG로 저장" 클릭 시 320×320 크기의 PNG 파일이 다운로드된다.
- [ ] 다운로드된 이미지에서 각 픽셀 블록의 경계가 흐려지지 않고 또렷하다(안티앨리어싱 없음).
- [ ] 그리지 않은 칸은 PNG에서 투명하게(체크무늬 배경의 뷰어로 열었을 때 배경이 비치는지) 저장된다.
- [ ] 파일명이 `pixel-art-`로 시작하고 매번 다운로드할 때마다 겹치지 않는다(타임스탬프 포함).

**모바일 터치**
- [ ] 모바일(브라우저 개발자 도구의 디바이스 에뮬레이션 또는 실기기)에서 손가락으로 격자를 터치하면 칠해진다.
- [ ] 손가락을 누른 채 이동(드래그)하면 지나간 칸들이 연속으로 칠해진다.
- [ ] 격자 안에서 그림을 그리는 동안 페이지가 스크롤되거나 확대/축소되지 않는다.
- [ ] 격자 바깥 영역(팔레트 등)에서는 평소처럼 페이지 스크롤이 정상 동작한다.

**반응형/레이아웃**
- [ ] 좁은 화면(예: 375px 너비)에서도 격자와 도구 패널이 잘리지 않고 세로로 정상 배치된다.
- [ ] 데스크톱 넓은 화면에서는 격자와 도구 패널이 좌우로 나란히 배치된다.
- [ ] 버튼들의 터치 영역이 모바일에서 누르기에 충분히 크다(대략 44px 이상).
- [ ] 블로그의 다크모드 설정과 무관하게 이 앱은 항상 동일한(고정) 라이트 팔레트로 보인다.

**독립성**
- [ ] `/apps/pixel-art/` 폴더의 파일만으로 정상 동작하며, 블로그 루트의 다른 파일(build.js, templates/, posts/, assets/, 블로그 메인 index.html)을 참조하거나 수정하지 않는다.
