(function () {
  "use strict";

  const GRID_SIZE = 16;
  const CELL_EXPORT_SIZE = 20; // px, 셀 하나를 저장 시 20x20으로 그림

  const PRESET_COLORS = [
    { color: "#000000", label: "검정" },
    { color: "#ffffff", label: "흰색" },
    { color: "#808080", label: "회색" },
    { color: "#c0c0c0", label: "밝은 회색" },
    { color: "#ff0000", label: "빨강" },
    { color: "#ff7f00", label: "주황" },
    { color: "#ffff00", label: "노랑" },
    { color: "#00ff00", label: "라임" },
    { color: "#008000", label: "진초록" },
    { color: "#00ffff", label: "시안" },
    { color: "#0000ff", label: "파랑" },
    { color: "#000080", label: "남색" },
    { color: "#800080", label: "보라" },
    { color: "#ff00ff", label: "마젠타" },
    { color: "#a52a2a", label: "갈색" },
    { color: "#ffc0cb", label: "살구색" },
  ];

  // grid[row][col] : 칠해진 색이면 "#rrggbb" 문자열, 빈 칸이면 null
  let grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
  let cellElements = []; // grid와 동일한 [row][col] 구조로 DOM 참조 보관

  let currentColor = PRESET_COLORS[0].color;
  let eraserActive = false;
  let isDrawing = false;
  let lastPaintedCell = null; // { row, col } 직전에 칠한 셀 캐시(중복 스킵용)

  const gridEl = document.getElementById("pixel-grid");
  const paletteEl = document.getElementById("palette-grid");
  const customColorEl = document.getElementById("custom-color");
  const eraserBtn = document.getElementById("eraser-btn");
  const clearBtn = document.getElementById("clear-btn");
  const saveBtn = document.getElementById("save-btn");
  const currentColorPreview = document.getElementById("current-color-preview");

  // ---------- 격자 초기 렌더링 ----------

  function buildGrid() {
    const fragment = document.createDocumentFragment();
    cellElements = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      const rowEls = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "pixel-cell";
        cell.dataset.row = String(r);
        cell.dataset.col = String(c);
        cell.tabIndex = -1;
        cell.draggable = false;
        cell.setAttribute("aria-label", `행 ${r + 1}, 열 ${c + 1}`);
        fragment.appendChild(cell);
        rowEls.push(cell);
      }
      cellElements.push(rowEls);
    }
    gridEl.appendChild(fragment);
  }

  function renderAll() {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        cellElements[r][c].style.backgroundColor = grid[r][c] || "transparent";
      }
    }
  }

  function paintCell(row, col, color) {
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return;
    grid[row][col] = color; // color는 hex 문자열 또는 null(지우개)
    const cell = cellElements[row][col];
    cell.style.backgroundColor = color || "transparent";
  }

  // ---------- 팔레트 렌더링 ----------

  function buildPalette() {
    const fragment = document.createDocumentFragment();
    PRESET_COLORS.forEach(({ color, label }) => {
      const swatch = document.createElement("button");
      swatch.type = "button";
      swatch.className = "swatch";
      swatch.dataset.color = color;
      swatch.style.backgroundColor = color;
      swatch.setAttribute("aria-label", label);
      swatch.addEventListener("click", () => {
        currentColor = swatch.dataset.color;
        eraserActive = false;
        updateSelectionUI();
      });
      fragment.appendChild(swatch);
    });
    paletteEl.appendChild(fragment);
  }

  function updateSelectionUI() {
    // 1. 프리셋 스와치 선택 표시
    const swatches = paletteEl.querySelectorAll(".swatch");
    swatches.forEach((swatch) => {
      const isSelected = !eraserActive && swatch.dataset.color === currentColor;
      swatch.classList.toggle("selected", isSelected);
    });

    // 2. 지우개 활성 표시
    eraserBtn.classList.toggle("active", eraserActive);

    // 3. 현재 색상 미리보기
    if (eraserActive) {
      currentColorPreview.style.backgroundColor = "transparent";
    } else {
      currentColorPreview.style.backgroundColor = currentColor;
    }
  }

  // ---------- 좌표 -> 셀 변환 및 공통 그리기 로직 ----------

  function getCellFromPoint(clientX, clientY) {
    const el = document.elementFromPoint(clientX, clientY);
    if (!el || !el.classList.contains("pixel-cell")) return null;
    return { row: Number(el.dataset.row), col: Number(el.dataset.col) };
  }

  function paintAtPoint(clientX, clientY) {
    const cell = getCellFromPoint(clientX, clientY);
    if (!cell) return;
    if (
      lastPaintedCell &&
      lastPaintedCell.row === cell.row &&
      lastPaintedCell.col === cell.col
    ) {
      return; // 성능: 직전에 칠한 셀과 동일하면 스킵
    }
    lastPaintedCell = cell;
    paintCell(cell.row, cell.col, eraserActive ? null : currentColor);
  }

  // ---------- 마우스 이벤트 ----------

  gridEl.addEventListener("mousedown", (event) => {
    isDrawing = true;
    lastPaintedCell = null;
    paintAtPoint(event.clientX, event.clientY);
  });

  gridEl.addEventListener("mousemove", (event) => {
    if (!isDrawing) return;
    paintAtPoint(event.clientX, event.clientY);
  });

  window.addEventListener("mouseup", () => {
    isDrawing = false;
    lastPaintedCell = null;
  });

  gridEl.addEventListener("dragstart", (event) => {
    event.preventDefault();
  });

  // ---------- 터치 이벤트 ----------

  gridEl.addEventListener(
    "touchstart",
    (event) => {
      event.preventDefault();
      isDrawing = true;
      lastPaintedCell = null;
      const touch = event.touches[0];
      if (touch) paintAtPoint(touch.clientX, touch.clientY);
    },
    { passive: false }
  );

  gridEl.addEventListener(
    "touchmove",
    (event) => {
      event.preventDefault();
      if (!isDrawing) return;
      const touch = event.touches[0];
      if (touch) paintAtPoint(touch.clientX, touch.clientY);
    },
    { passive: false }
  );

  function endTouch() {
    isDrawing = false;
    lastPaintedCell = null;
  }

  gridEl.addEventListener("touchend", endTouch);
  gridEl.addEventListener("touchcancel", endTouch);

  // ---------- 커스텀 색상 ----------

  customColorEl.addEventListener("input", (event) => {
    currentColor = event.target.value;
    eraserActive = false;
    updateSelectionUI();
  });

  // ---------- 지우개 ----------

  eraserBtn.addEventListener("click", () => {
    eraserActive = true;
    updateSelectionUI();
  });

  // ---------- 전체 지우기 ----------

  clearBtn.addEventListener("click", () => {
    const confirmed = window.confirm("정말 모두 지울까요? 되돌릴 수 없습니다.");
    if (!confirmed) return;
    grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
    renderAll();
  });

  // ---------- PNG 저장 ----------

  function buildExportCanvas() {
    const canvas = document.getElementById("export-canvas");
    canvas.width = GRID_SIZE * CELL_EXPORT_SIZE; // 320
    canvas.height = GRID_SIZE * CELL_EXPORT_SIZE; // 320
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height); // 빈 칸은 투명(alpha=0)으로 남김
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const color = grid[r][c];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(
            c * CELL_EXPORT_SIZE,
            r * CELL_EXPORT_SIZE,
            CELL_EXPORT_SIZE,
            CELL_EXPORT_SIZE
          );
        }
      }
    }
    return canvas;
  }

  function downloadPNG() {
    const canvas = buildExportCanvas();
    canvas.toBlob((blob) => {
      if (!blob) return;
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

  saveBtn.addEventListener("click", downloadPNG);

  // ---------- 초기화 ----------

  function init() {
    buildGrid();
    buildPalette();
    renderAll();
    updateSelectionUI();
  }

  init();
})();
