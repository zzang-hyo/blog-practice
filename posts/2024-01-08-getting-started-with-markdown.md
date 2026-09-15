---
title: "마크다운 문법 살펴보기"
date: 2024-01-08
tags: [마크다운, 튜토리얼]
description: "이 블로그에서 지원하는 주요 마크다운 문법을 예시로 정리합니다."
---

이 글에서는 자주 쓰는 마크다운 문법을 예시와 함께 정리합니다.

## 코드 블록

인라인 코드는 이렇게 `const x = 1;` 표시되고, 코드 블록은 다음과 같습니다.

```js
function greet(name) {
  return `Hello, ${name}!`;
}
```

## 목록

순서 없는 목록:

- 마크다운 파싱: `marked`
- 프론트매터 파싱: `gray-matter`
- 배포: GitHub Actions + GitHub Pages

순서 있는 목록:

1. 글 작성 (`posts/*.md`)
2. `npm run build` 실행
3. `dist/`를 배포

## 인용문

> 좋은 글은 간결하다.

## 표

| 항목 | 설명 |
| --- | --- |
| title | 글 제목 |
| date | 발행일 |
| tags | 태그 목록 |
