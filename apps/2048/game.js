"use strict";

/* ===== 상태 ===== */

const BEST_SCORE_KEY = "2048-best-score";
const SWIPE_THRESHOLD = 30;

const state = {
  board: emptyBoard(),
  score: 0,
  best: loadBest(),
  isGameOver: false,
  hasWon: false, // 2048 타일을 이미 만들었는지 (승리 오버레이 재노출 방지용)
  keepPlaying: false,
};

/* ===== DOM 참조 ===== */

const boardEl = document.getElementById("board");
const scoreEl = document.getElementById("score");
const bestScoreEl = document.getElementById("best-score");
const finalScoreEl = document.getElementById("final-score");
const newGameBtn = document.getElementById("new-game-btn");
const restartBtn = document.getElementById("restart-btn");
const winNewGameBtn = document.getElementById("win-new-game-btn");
const keepPlayingBtn = document.getElementById("keep-playing-btn");
const gameOverOverlay = document.getElementById("game-over-overlay");
const winOverlay = document.getElementById("win-overlay");

/* ===== 보드 유틸 ===== */

function emptyBoard() {
  return [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
}

function cloneBoard(board) {
  return board.map((row) => row.slice());
}

// 4x4 배열을 전치(transpose)한다. 숫자든 불리언이든 값 종류에 무관하게 동작한다.
function transpose(board) {
  const result = emptyGrid();
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      result[c][r] = board[r][c];
    }
  }
  return result;
}

// 각 행을 좌우로 뒤집는다.
function reverseRows(board) {
  return board.map((row) => row.slice().reverse());
}

function emptyGrid() {
  return [[], [], [], []].map(() => [undefined, undefined, undefined, undefined]);
}

// 방향별로 보드를 "왼쪽으로 미는" 표준 방향으로 맞추는 변환(pre)과
// 그 결과를 다시 원래 방향으로 되돌리는 역변환(post)을 정의한다.
// transpose와 reverseRows는 둘 다 자기 자신이 역함수이므로(involution)
// down 방향만 두 변환의 합성을 순서를 바꿔 역변환한다.
const DIRECTIONS = {
  ArrowLeft: { pre: (b) => b, post: (b) => b },
  ArrowRight: { pre: reverseRows, post: reverseRows },
  ArrowUp: { pre: transpose, post: transpose },
  ArrowDown: {
    pre: (b) => reverseRows(transpose(b)),
    post: (b) => transpose(reverseRows(b)),
  },
};

/* ===== 한 줄 압축+합치기 ===== */

// row: 길이 4인 숫자 배열. 왼쪽으로 밀어 압축하고 인접한 동일 값을 합친다.
// 한 번의 호출(=한 번의 이동)에서 결과 타일 하나는 최대 한 번만 합쳐진다.
function slideAndMergeRow(row) {
  const filtered = row.filter((v) => v !== 0);
  const result = [];
  const mergedIndices = [];
  let scoreGained = 0;

  let i = 0;
  while (i < filtered.length) {
    const current = filtered[i];
    const next = filtered[i + 1];
    if (next !== undefined && current === next) {
      const mergedValue = current * 2;
      result.push(mergedValue);
      mergedIndices.push(result.length - 1);
      scoreGained += mergedValue;
      i += 2;
    } else {
      result.push(current);
      i += 1;
    }
  }

  while (result.length < 4) {
    result.push(0);
  }

  return { result, scoreGained, mergedIndices };
}

/* ===== 이동 처리 ===== */

function move(direction) {
  if (state.isGameOver) return;

  const dirConf = DIRECTIONS[direction];
  if (!dirConf) return;

  const before = JSON.stringify(state.board);

  const workBoard = dirConf.pre(cloneBoard(state.board));
  const resultRows = [];
  const mergedMaskRows = [];
  let scoreGained = 0;

  for (let r = 0; r < 4; r++) {
    const { result, scoreGained: rowScore, mergedIndices } = slideAndMergeRow(workBoard[r]);
    resultRows.push(result);
    const maskRow = [false, false, false, false];
    mergedIndices.forEach((idx) => {
      maskRow[idx] = true;
    });
    mergedMaskRows.push(maskRow);
    scoreGained += rowScore;
  }

  const newBoard = dirConf.post(resultRows);
  const mergedMask = dirConf.post(mergedMaskRows);

  const after = JSON.stringify(newBoard);
  if (before === after) {
    // 변화 없음: 새 타일 생성 없이 아무 것도 하지 않는다.
    return;
  }

  state.board = newBoard;
  state.score += scoreGained;
  if (state.score > state.best) {
    state.best = state.score;
    saveBest();
  }

  const newTilePos = spawnRandomTile();

  checkWinCondition();
  checkGameOverCondition();

  render({ mergedMask, newTilePos });
}

/* ===== 새 타일 생성 ===== */

function spawnRandomTile() {
  const emptyCells = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (state.board[r][c] === 0) emptyCells.push([r, c]);
    }
  }
  if (emptyCells.length === 0) return null;

  const [row, col] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  state.board[row][col] = Math.random() < 0.9 ? 2 : 4;
  return { row, col };
}

/* ===== 승리/패배 판정 ===== */

function checkWinCondition() {
  if (state.hasWon) return;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (state.board[r][c] === 2048) {
        state.hasWon = true;
        showWinOverlay();
        return;
      }
    }
  }
}

function boardHasMovesLeft() {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const value = state.board[r][c];
      if (value === 0) return true;
      if (c + 1 < 4 && state.board[r][c + 1] === value) return true;
      if (r + 1 < 4 && state.board[r + 1][c] === value) return true;
    }
  }
  return false;
}

function checkGameOverCondition() {
  if (!boardHasMovesLeft()) {
    state.isGameOver = true;
    showGameOverOverlay();
  }
}

/* ===== 점수 저장 ===== */

function loadBest() {
  try {
    const stored = localStorage.getItem(BEST_SCORE_KEY);
    const parsed = stored ? parseInt(stored, 10) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  } catch (e) {
    return 0;
  }
}

function saveBest() {
  try {
    localStorage.setItem(BEST_SCORE_KEY, String(state.best));
  } catch (e) {
    // localStorage를 쓸 수 없는 환경(예: 프라이빗 모드)에서는 조용히 무시한다.
  }
}

/* ===== 렌더링 ===== */

function render({ mergedMask, newTilePos } = {}) {
  boardEl.innerHTML = "";

  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";

      const value = state.board[r][c];
      if (value !== 0) {
        const tile = document.createElement("div");
        tile.className = "tile";
        tile.dataset.value = String(value);
        if (value > 2048) tile.dataset.super = "true";

        const digits = String(value).length;
        tile.dataset.digits = digits >= 4 ? "4+" : String(digits);

        tile.textContent = String(value);

        if (newTilePos && newTilePos.row === r && newTilePos.col === c) {
          tile.classList.add("new");
        }
        if (mergedMask && mergedMask[r][c]) {
          tile.classList.add("merged");
        }

        cell.appendChild(tile);
      }

      boardEl.appendChild(cell);
    }
  }

  scoreEl.textContent = String(state.score);
  bestScoreEl.textContent = String(state.best);
}

/* ===== 오버레이 ===== */

function showGameOverOverlay() {
  finalScoreEl.textContent = String(state.score);
  gameOverOverlay.hidden = false;
}

function hideGameOverOverlay() {
  gameOverOverlay.hidden = true;
}

function showWinOverlay() {
  winOverlay.hidden = false;
}

function hideWinOverlay() {
  winOverlay.hidden = true;
}

/* ===== 새 게임 ===== */

function initGame() {
  state.board = emptyBoard();
  state.score = 0;
  state.isGameOver = false;
  state.hasWon = false;
  state.keepPlaying = false;

  hideGameOverOverlay();
  hideWinOverlay();

  spawnRandomTile();
  spawnRandomTile();

  render({});
}

/* ===== 입력 처리: 키보드 ===== */

const KEY_TO_DIRECTION = {
  ArrowLeft: "ArrowLeft",
  ArrowRight: "ArrowRight",
  ArrowUp: "ArrowUp",
  ArrowDown: "ArrowDown",
  a: "ArrowLeft",
  A: "ArrowLeft",
  d: "ArrowRight",
  D: "ArrowRight",
  w: "ArrowUp",
  W: "ArrowUp",
  s: "ArrowDown",
  S: "ArrowDown",
};

function handleKeydown(event) {
  const direction = KEY_TO_DIRECTION[event.key];
  if (!direction) return;

  event.preventDefault();
  if (state.isGameOver) return;

  move(direction);
}

window.addEventListener("keydown", handleKeydown);

/* ===== 입력 처리: 모바일 터치 스와이프 ===== */

let touchStartX = 0;
let touchStartY = 0;
let touchActive = false;

boardEl.addEventListener(
  "touchstart",
  (event) => {
    if (event.touches.length !== 1) return;
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
    touchActive = true;
  },
  { passive: true }
);

boardEl.addEventListener(
  "touchmove",
  (event) => {
    if (touchActive) event.preventDefault();
  },
  { passive: false }
);

boardEl.addEventListener("touchend", (event) => {
  if (!touchActive) return;
  touchActive = false;
  if (state.isGameOver) return;

  const touch = event.changedTouches[0];
  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (Math.max(absDx, absDy) < SWIPE_THRESHOLD) return; // 탭으로 간주, 무시

  const direction =
    absDx > absDy
      ? dx > 0
        ? "ArrowRight"
        : "ArrowLeft"
      : dy > 0
      ? "ArrowDown"
      : "ArrowUp";

  move(direction);
});

boardEl.addEventListener("touchcancel", () => {
  touchActive = false;
});

/* ===== 버튼 ===== */

newGameBtn.addEventListener("click", initGame);
restartBtn.addEventListener("click", initGame);
winNewGameBtn.addEventListener("click", initGame);
keepPlayingBtn.addEventListener("click", () => {
  state.keepPlaying = true;
  hideWinOverlay();
});

/* ===== 초기화 ===== */

initGame();
