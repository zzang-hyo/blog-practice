# CLAUDE.md

## 프로젝트 개요

마크다운(`.md`) 파일을 정적 블로그 웹사이트로 변환하는 프로젝트다.

- **프레임워크 없음**: React/Vue/Next 등 UI 프레임워크나 번들러를 쓰지 않는다.
  순수 HTML/CSS/JS로 구현한다.
- **빌드 타임 렌더링**: Node.js 빌드 스크립트가 `posts/*.md`를 읽어 정적
  `.html`로 미리 변환해 `dist/`에 출력한다. 브라우저에서 마크다운을 즉석으로
  파싱하지 않는다 (SEO와 초기 로딩 속도를 위함).
- **디자인 요구사항**: 깔끔하고 읽기 좋은 타이포그래피, 다크모드 지원,
  모바일에서도 잘 보이는 반응형 레이아웃.

## 디렉터리 구조

```
posts/              # 원본 마크다운 글 (front matter 포함)
  YYYY-MM-DD-slug.md
templates/           # HTML 골격 템플릿 (문자열 치환 방식, 템플릿 엔진 없음)
  post.html
  index.html
assets/
  css/style.css      # 라이트/다크 테마, 반응형 스타일
  js/main.js         # 클라이언트 측 상호작용 (다크모드 토글 등)
build.js             # posts/*.md -> dist/*.html 빌드 스크립트
dist/                # 빌드 산출물 (배포 대상, 예: GitHub Pages)
package.json
```

## 빌드 파이프라인 (build.js)

1. `posts/` 안의 각 `.md` 파일을 읽는다.
2. `gray-matter`로 front matter(메타데이터)와 본문을 분리한다.
3. `marked`로 본문 마크다운을 HTML로 파싱한다.
4. `templates/post.html`의 플레이스홀더(`{{title}}`, `{{content}}` 등)를
   문자열 치환으로 채워 완성된 HTML을 만든다.
5. 모든 글의 메타데이터를 모아 `templates/index.html`을 채워 글 목록
   페이지(`dist/index.html`)를 만든다.
6. 결과물을 `dist/`에 출력한다. `assets/`는 그대로 `dist/assets/`로 복사한다.

템플릿 엔진(EJS, Handlebars 등)은 쓰지 않는다 — 단순 문자열 치환으로 충분한
수준을 유지한다. "프레임워크 없음" 원칙은 런타임(브라우저)뿐 아니라 빌드
스크립트에도 적용된다: `marked`/`gray-matter` 외의 빌드 도구(번들러, CSS
전처리기 등)를 추가하지 않는다.

## Front matter 포맷

각 마크다운 글 상단에 YAML front matter를 둔다:

```
---
title: "제목"
date: 2024-01-01
tags: [tag1, tag2]
description: "목록/메타 태그에 쓰일 요약"
---

본문 내용...
```

## 명령어

```
npm install     # marked, gray-matter 설치
npm run build   # posts/*.md -> dist/ 빌드
```

로컬 미리보기는 별도 서버 패키지 없이 `npx serve dist` 또는 `python3 -m
http.server` 등 가벼운 static 서버로 확인한다.

## 디자인/코딩 컨벤션

- **시맨틱 HTML**을 사용한다 (`header`, `nav`, `main`, `article`, `footer`).
  이미지에는 `alt`, heading은 계층 순서(`h1` → `h2` → `h3`)를 지킨다.
- **다크모드**: CSS 커스텀 프로퍼티(`--bg`, `--text`, `--accent` 등)로
  라이트/다크 팔레트를 정의한다. 기본값은 `prefers-color-scheme: dark`
  미디어쿼리를 따르고, 사용자가 토글하면 `localStorage`에 선택을 저장해
  다음 방문 시에도 유지한다. 색 대비는 WCAG AA 기준을 넘도록 한다.
- **반응형**: 모바일 퍼스트로 작성한다. 본문 폭은 `max-width`로 제한해
  긴 줄 읽기를 방지하고, 대략 480px/768px 기준으로 레이아웃을 조정한다.
- **의존성 최소화**: 빌드 타임에는 `marked`, `gray-matter`만 사용한다.
  클라이언트 JS는 다크모드 토글 같은 가벼운 상호작용에만 쓰고, 콘텐츠
  렌더링에는 관여하지 않는다.
- 기존 일반 원칙을 따른다: 불필요한 추상화·주석을 넣지 않고, WHY가
  비직관적일 때만 짧은 주석을 남긴다.
