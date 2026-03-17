# Mistake Retrospective Log

## [2026-03-17 15:00] 초기 프로젝트 셋업 — Vite 버전 호환 이슈

- 증상: Vite 8 (create-vite@9)이 Node.js 20.18.0에서 실행 불가. `rolldown` 네이티브 바인딩 로드 실패.
- 원인: Vite 8은 Node.js 20.19+ 또는 22.12+를 요구. 현재 환경이 20.18.0.
- 해결: Vite 6 + @vitejs/plugin-react@4로 다운그레이드하여 정상 동작 확인.
- 재발 방지: 프로젝트 생성 시 현재 Node.js 버전을 먼저 확인하고, `create-vite`의 최신 버전이 요구하는 Node 버전과 비교 후 설치할 것. 필요시 `--template` 없이 수동으로 `vite@6`을 지정.
- 검증: `npx vite --port 5173` 정상 기동, `npx tsc --noEmit` 타입 체크 통과.
- 관련 파일: `package.json`, `vite.config.ts`

## [2026-03-17 16:30] v1.1 패치 — 뷰 초기화, 요일표시, SVG아이콘, 한글이중입력, 메모입력

- 증상: (1) 뷰 초기화 버튼 없음 (2) 요일 표시 없음 (3) 이모지 아이콘 (4) 맥 한글 입력 시 이중 입력 (5) 메모 입력 칸이 작고 마크다운 미지원
- 원인: 초기 구현에서 해당 기능을 포함하지 않았음. 한글 이중 입력은 IME 조합 상태에서 Enter 이벤트가 두 번 발생하는 브라우저 동작.
- 해결: (1) resetView 액션 + Fit to screen 버튼 추가 (2) DayOfWeekHeader 컴포넌트 생성 (3) Icons.tsx에 17개 SVG 벡터 아이콘 생성 후 전체 교체 (4) `e.nativeEvent.isComposing` 체크 추가 (5) textarea + resize + 마크다운 힌트 UI
- 재발 방지: IME 입력이 있는 모든 키보드 이벤트에 isComposing 체크를 기본으로 넣을 것. 아이콘은 처음부터 SVG 컴포넌트로 만들 것.
- 검증: `npx tsc --noEmit` 통과. HMR 정상 동작.
- 관련 파일: `src/components/icons/Icons.tsx`, `src/components/board/YearBoard.tsx`, `src/components/board/DayOfWeekHeader.tsx`, `src/components/toolbar/TopToolbar.tsx`, `src/components/panels/LeftIconBar.tsx`, `src/components/panels/BacklogPanel.tsx`, `src/components/panels/RightPanel.tsx`, `src/store/board-store.ts`, `src/utils/date.ts`, `src/utils/zoom.ts`

## [2026-03-17 17:30] v1.2 패치 — passive wheel, 아이콘 깨짐, 요일 불일치, 백로그 UX

- 증상: (1) wheel 이벤트에서 preventDefault 불가로 콘솔 경고 + 렉 (2) Hand SVG 아이콘 깨짐 (3) 요일이 1월 기준으로만 표시되어 다른 월과 불일치 (4) 백로그 done 토글 시 아이템 즉시 소멸 (5) 긴 메모 내용 확인 불가
- 원인: (1) React의 `onWheel`은 passive로 등록되어 `preventDefault()` 호출 불가 (2) Hand 아이콘의 SVG path가 복잡하여 작은 사이즈에서 렌더링 불량 (3) `DayOfWeekHeader`가 year+month=0(1월)만 사용하여 모든 월에 동일 요일 표시 (4) `backlogItems` 필터가 `status !== 'done'`으로 즉시 제외 (5) body가 60자로 잘려 전체 표시 불가
- 해결: (1) `useEffect` + `addEventListener('wheel', handler, { passive: false })`로 변경하고 `containerRef`를 hook에 전달 (2) `IconMove`(십자 화살표) 아이콘으로 교체 (3) `DayOfWeekHeader` 삭제 → 각 DayCell 내에서 실제 날짜 기반 요일 표시 (4) done 아이템을 별도 "완료됨" 접이식 섹션에 표시 (5) 아이템 클릭 시 expand/collapse로 전체 body 표시
- 재발 방지: (1) React에서 wheel/touch 이벤트의 preventDefault는 반드시 native addEventListener 사용 (2) SVG 아이콘은 작은 사이즈에서 테스트 후 적용 (3) 날짜/요일 관련 로직은 반드시 실제 년/월을 기반으로 계산 (4) 필터로 제거되는 아이템은 별도 UI로 확인 가능하게 할 것
- 검증: `npx tsc --noEmit` 통과
- 관련 파일: `src/hooks/useZoomPan.ts`, `src/components/board/YearBoard.tsx`, `src/components/board/DayCell.tsx`, `src/components/board/MonthRow.tsx`, `src/components/icons/Icons.tsx`, `src/components/toolbar/TopToolbar.tsx`, `src/components/panels/BacklogPanel.tsx`, `src/components/panels/BacklogPanel.css`, `src/types/view-models.ts`, `src/utils/zoom.ts`, `src/store/board-store.ts`

## [2026-03-17 18:00] v1.3 패치 — setState-during-render, 줌 미동작, 상태 토글

- 증상: (1) 팬 시 극심한 렉 + "[Violation] message handler took 219ms" (2) "Cannot update a component (TopToolbar) while rendering (YearBoard)" 에러 (3) 줌(Ctrl+wheel)이 전혀 동작하지 않음 (4) 상태 토글에 2번 클릭 필요
- 원인: `YearBoard.tsx:51`에서 `useBoardStore.setState({ _fitToScreen: fitToScreen })` 를 **렌더 함수 본문**에서 직접 호출. 이로 인해 React가 YearBoard 렌더 중 store를 업데이트 → TopToolbar 등 구독 컴포넌트가 재렌더링 → 다시 YearBoard가 렌더 → 반복. 이 무한 루프가 메인 스레드를 점유하여 wheel 이벤트 핸들러가 실행될 틈이 없었음. 줌 로직 자체는 정상이었으나 실행 불가 상태.
- 해결: (1) `_fitToScreen`을 store에서 제거. module-level ref(`fitToScreenRef`)로 교체. `useEffect`에서 ref 등록/해제. TopToolbar는 ref를 직접 읽음 → 렌더 중 setState 완전 제거 (2) 상태 토글을 3단계 순환(none→in-progress→done) → 1클릭 토글(none↔done)로 변경
- 재발 방지: **절대로 React 렌더 함수 본문에서 `setState` / `store.setState`를 호출하지 말 것.** 부수효과는 반드시 `useEffect` 내에서 실행. 컴포넌트 간 함수 공유가 필요하면 module ref 또는 callback ref 패턴 사용.
- 검증: `npx tsc --noEmit` 통과. 콘솔 에러/경고 없음 확인.
- 관련 파일: `src/components/board/YearBoard.tsx`, `src/components/toolbar/TopToolbar.tsx`, `src/components/panels/BacklogPanel.tsx`

## [2026-03-17 18:30] v1.4 패치 — wheel 리스너 미등록 (줌 완전 미동작)

- 증상: Ctrl+wheel 줌이 전혀 동작하지 않음. 팬은 동작.
- 원인: `YearBoard`에서 `boardState`가 null일 때 early return(`if (!boardState) return <div>...</div>`)으로 `ref={containerRef}`가 붙은 container div가 렌더되지 않음. `useZoomPan`의 `useEffect`는 첫 렌더 후 실행되는데, 이 시점에 `containerRef.current === null`이라 `if (!el) return`으로 리스너 등록을 건너뜀. 이후 `boardState`가 생겨 container div가 마운트되지만, useEffect 의존성(`containerRef`, `setView`, `updateZoomLevel`)은 변하지 않아 effect가 재실행되지 않음. 결과적으로 wheel 리스너가 **영구 미등록**.
- 해결: early return 제거. 항상 같은 container div를 렌더하고, 내부에서 `boardState` 유무에 따라 조건부 렌더링. `containerRef`가 항상 유효하므로 useEffect 첫 실행에서 리스너 정상 등록.
- 재발 방지: **useRef + useEffect로 native 이벤트를 등록할 때, ref가 붙은 element가 조건부 렌더링(early return)에 의해 마운트되지 않을 수 있는지 반드시 확인.** 조건부 content는 항상 container 내부에서 처리할 것.
- 검증: `npx tsc --noEmit` 통과.
- 관련 파일: `src/components/board/YearBoard.tsx`, `src/components/board/YearBoard.css`
