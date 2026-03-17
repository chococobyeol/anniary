# Mistake Retrospective Log

## [2026-03-17 15:00] 초기 프로젝트 셋업 — Vite 버전 호환 이슈

- 증상: Vite 8 (create-vite@9)이 Node.js 20.18.0에서 실행 불가. `rolldown` 네이티브 바인딩 로드 실패.
- 원인: Vite 8은 Node.js 20.19+ 또는 22.12+를 요구. 현재 환경이 20.18.0.
- 해결: Vite 6 + @vitejs/plugin-react@4로 다운그레이드하여 정상 동작 확인.
- 재발 방지: 프로젝트 생성 시 현재 Node.js 버전을 먼저 확인하고, `create-vite`의 최신 버전이 요구하는 Node 버전과 비교 후 설치할 것. 필요시 `--template` 없이 수동으로 `vite@6`을 지정.
- 검증: `npx vite --port 5173` 정상 기동, `npx tsc --noEmit` 타입 체크 통과.
- 관련 파일: `package.json`, `vite.config.ts`
