# Mistake Retrospective Log

> **타임스탬프:** 새 항목의 날짜·시간은 Cursor 채팅의 "Today's date"만 쓰지 말고, 로컬 터미널 `date '+%Y-%m-%d %H:%M %Z'` 결과를 그대로 쓸 것.

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

## [2026-03-17 19:45] 디테일 저장 시 기간 막대(줄) 중복 증식

- 증상: 아이템 디테일을 수정·저장할 때마다 간트/기간 막대(줄)가 하나씩 더 생김.
- 원인: `ItemDetail`의 `saveEdit`에서 기간(종료일)이 있으면 **매번 `createRange`만** 호출해 새 `RangeEntity`가 누적되고, 기존 `rangeId`가 가리키던 range는 `ranges`에 남아(고아) 화면에 여러 줄로 그려짐.
- 해결: 기존 `item.rangeId`와 `ranges[id]`가 있으면 **`updateRange`**로 기간/라벨만 갱신. 없을 때만 **`createRange`**. 기간을 끄거나 `rangeId`가 바뀌면 다른 아이템이 참조하지 않을 때 **`deleteRange(oldRid)`**. 중복되던 `deleteRange` 분기 정리. 본문은 `lines.slice(1).join('\n')` 후 `trim()`으로 비었는지만 판별해 내부 줄바꿈은 유지.
- 재발 방지: 연결된 엔티티( range 등 )를 저장할 때 **항상 생성(create)** 경로만 쓰지 말고, **같은 id가 있으면 update**를 우선하고, 참조가 사라진 리소스는 **고아 정리(delete/unlink)** 규칙을 한 곳에 명시할 것.
- 검증: `npm run build` 성공, `DetailPanel.tsx` 린트 이슈 없음.
- 관련 파일: `src/components/panels/DetailPanel.tsx`

## [2026-03-17 20:30] 아이템 디테일 — 기간 색상 즉시 저장으로 취소 무효

- 증상: 아이템 디테일에서 기간 색을 바꾼 뒤 **취소**해도 보드/데이터에 색이 이미 바뀐 채로 남음.
- 원인: `Period color` 스와치 `onClick`에서 **`updateRange`를 즉시 호출**해 전역 스토어가 바뀌고, 취소는 선택만 닫을 뿐 스토어를 되돌리지 않음.
- 해결: `editPeriodColor` 로컬 상태로만 미리보기하고, **`saveEdit`에서 `updateRange`/`createRange`에 `color`를 함께 반영**. `useEffect`로 아이템/연결 range 로드 시 스토어 색으로 동기화.
- 재발 방지: 폼에 **저장/취소**가 있으면, 연관 엔티티(range 등) 필드도 **저장 시점에만** 스토어에 쓰거나, 취소 시 스냅샷으로 복구할 것.
- 검증: `npm run build` 성공, `DetailPanel.tsx` 린트 이슈 없음.
- 관련 파일: `src/components/panels/DetailPanel.tsx`

## [2026-03-17 21:15] 디테일 저장/취소 일관성 + 기간 색 실시간 미리보기

- 증상: (1) Range 디테일은 Kind/Status/색이 즉시 저장되어 취소와 불일치 (2) 아이템 디테일에서 기간 색은 저장 전까지 보드 간트에 안 보임.
- 원인: Range 메타를 즉시 `updateRange`에 쓰는 구조. 색만 로컬이면 간트는 스토어 `range`만 참조.
- 해결: `rangeEditPreview` + `setRangeEditPreview`(dirty 없음)로 저장 전 간트에 색·kind 병합. RangeDetail 전 필드 draft + Save/Cancel(Esc). ItemDetail은 preview 동기화·헤더 색 보더. ItemDetail hooks 순서 수정.
- 재발 방지: 취소 가능 폼은 스토어 직접 변경 금지, 보드 미리보기는 preview 레이어로만.
- 검증: `npm run build` 성공.
- 관련 파일: `src/types/state.ts`, `src/store/board-store.ts`, `src/utils/monthGantt.ts`, `src/components/board/MonthRow.tsx`, `src/components/board/YearBoard.tsx`, `src/components/panels/DetailPanel.tsx`

## [2026-03-17 22:00] 기간 막대 숨김·우선순위 기능 추가

- 증상: (요구) 연간 보드 기간 막대를 숨기거나, 겹칠 때 표시 순위를 조정하고 싶음.
- 원인: (해당 없음 — 신규 기능)
- 해결: `RangeEntity`에 `timelineBarHidden`, `timelinePriority` 추가. `layoutMonthGanttSegments`에서 숨김 필터·우선순위 정렬 후 트랙 배치. `RangeEditPreview`에 동일 필드 반영해 저장 전 미리보기. ItemDetail·RangeDetail 폼 + `docs/TIMELINE_BARS.md`·README 문서화.
- 재발 방지: 보드 시각 정책이 바뀌면 엔티티 필드·`monthGantt`·미리보기 세 곳을 함께 갱신하고 문서(`TIMELINE_BARS.md`)를 맞출 것.
- 검증: `npm run build` 성공.
- 관련 파일: `src/types/entities.ts`, `src/types/state.ts`, `src/store/board-store.ts`, `src/utils/monthGantt.ts`, `src/components/panels/DetailPanel.tsx`, `src/components/panels/DetailPanel.css`, `docs/TIMELINE_BARS.md`, `README.md`, `docs/IMPLEMENTATION_CHECKLIST.md`

## [2026-03-17 22:45] Priority 라벨·셀 정렬·문서 정합

- 증상: UI가 "Bar priority"로만 읽혀 날짜 셀 안 일정 줄 순서와 무관해 보임. 실제로는 막대뿐 아니라 셀 요약 순서에도 쓰여야 함.
- 원인: 초기 카피가 막대 중심으로만 작성됨. 셀 정렬은 `linkedRangeTimelinePriority`로 반영하도록 코드가 맞춰진 뒤에도 라벨·힌트·문서가 뒤따르지 않은 상태.
- 해결: `DetailPanel` 라벨 **Priority**, 힌트에 day cells + bars 명시, `id`를 `range-priority-*` / `item-priority-*`로 정리. `RangeEntity` 주석·`TIMELINE_BARS.md`에 셀 정렬·`itemTimelinePriority.ts` 반영.
- 재발 방지: 보드에 보이는 정렬/레이아웃 규칙이 바뀌면 **영어 UI 카피·한글 기술 문서·엔티티 주석**을 한 번에 맞출 것.
- 검증: `npm run build` 성공.
- 관련 파일: `src/components/panels/DetailPanel.tsx`, `src/types/entities.ts`, `docs/TIMELINE_BARS.md`, `src/utils/itemTimelinePriority.ts`, `src/components/board/MonthRow.tsx`

## [2026-03-23 00:00] 구조 정리 — 저장계층·DetailPanel 분리·참조 무결성·린트

- 증상: (1) 저장/복원 없어 새로고침 시 데이터 유실 (2) DetailPanel 781줄 단일 파일, effect 안 setState로 ESLint error (3) deleteRange가 item.rangeId를 정리 안 함 (4) ESLint 9 error + 7 warning (5) YearBoard의 fitToScreenRef 상수 export로 react-refresh 에러
- 원인: 프로토타입 단계에서 persistence 미연동, 파일 분리 미실시, 삭제 로직 단방향 구현.
- 해결: (1) zustand persist 미들웨어로 localStorage 자동 저장/복원 + _hydrated 플래그로 hydration 대기. 기존 타입(InteractionMode, LeftPanelMode, RightPanelMode)과 dirty 플래그 모두 유지. (2) DetailPanel → detail/DayDetail·RangeDetail·ItemDetail 3파일 분리. key prop 기반 remount로 sync useEffect 제거, cascading setState 해소. JSX/CSS 클래스 100% 동일 유지. (3) deleteRange에서 연결 item의 rangeId를 undefined로 정리. (4) eslint.config에 varsIgnorePattern/argsIgnorePattern 추가, YearBoard memo 의존성을 별도 변수로 추출. (5) fitToScreenRef를 utils/fitToScreen.ts로 분리.
- 재발 방지: (1) 기존 설계 의도(미구현 기능 자리표, 타입 선언)를 삭제하지 말 것 — 미구현 기능은 구현하거나 비활성 표시만 (2) 파일 분리 시 원본 JSX/스타일을 1:1로 유지하고, 동작 변경은 별도 커밋으로 (3) 양방향 참조가 있는 엔티티 삭제 시 역방향 정리를 함께 구현
- 검증: `npm run build` 성공, `npx eslint src/` 0 error 0 warning.
- 관련 파일: `src/types/state.ts`, `src/store/board-store.ts`, `src/App.tsx`, `src/components/panels/DetailPanel.tsx`, `src/components/panels/detail/constants.ts`, `src/components/panels/detail/HelpTip.tsx`, `src/components/panels/detail/DayDetail.tsx`, `src/components/panels/detail/RangeDetail.tsx`, `src/components/panels/detail/ItemDetail.tsx`, `src/components/board/YearBoard.tsx`, `src/components/toolbar/TopToolbar.tsx`, `src/utils/fitToScreen.ts`, `eslint.config.js`

## [2026-03-23 12:00] UI 라벨 "Priority" → "Display order" 변경

- 증상: "Priority"라는 라벨이 UX적으로 혼란을 줌. "우선순위를 올린다"(숫자↑=더 중요)와 "1순위"(숫자↓=더 중요)가 충돌.
- 원인: 이 필드는 실제로 "정렬/표시 순서"인데 "Priority"라는 라벨이 중요도 개념과 혼동됨.
- 해결: UI 라벨을 "Display order"로, 힌트를 "Higher numbers appear on top…"으로 변경. 엔티티 주석·한글 기술 문서(`TIMELINE_BARS.md`)도 "우선순위" → "표시 순서"로 일괄 정합.
- 재발 방지: UI 카피 변경 시 라벨·힌트·엔티티 주석·기술 문서를 한 번에 맞출 것.
- 검증: `npm run build` 성공, `npx eslint src/` 0 error 0 warning.
- 관련 파일: `src/components/panels/detail/constants.ts`, `src/components/panels/detail/RangeDetail.tsx`, `src/components/panels/detail/ItemDetail.tsx`, `src/types/entities.ts`, `docs/TIMELINE_BARS.md`

## [2026-03-23 12:15] 간트 막대 표시 순서 정렬 방향 버그

- 증상: Display order 값을 높이면 막대가 위쪽이 아닌 아래쪽에 배치됨.
- 원인: `monthGantt.ts`에서 `b.priority - a.priority`(내림차순)로 정렬 후 track 0부터 배치하지만, track 0의 Y 좌표가 가장 아래쪽이므로 높은 값이 오히려 아래에 붙음.
- 해결: 정렬을 `a.priority - b.priority`(오름차순)으로 변경. 낮은 값이 먼저 하단 track을 차지하고, 높은 값은 나중에 처리되어 상단 track(위쪽)에 배치됨.
- 재발 방지: 정렬 방향과 시각적 배치 방향(track Y 좌표)의 관계를 실제 렌더링으로 확인할 것. "큰 값 = 먼저 처리"와 "먼저 처리 = 위쪽"이 항상 일치하지 않음.
- 검증: `npm run build` 성공.
- 관련 파일: `src/utils/monthGantt.ts`, `docs/TIMELINE_BARS.md`

## [2026-03-23 14:30] 단일 셀 일정 막대 일관성 + 시간 기반 부분 막대

- 증상: 셀 하루만 선택해 일정을 추가하면 `endDate`/range가 없어 연간 보드 기간 막대가 안 보임. 야간 등 같은 이틀에 걸친 시각은 날짜 칸 전체 막대로만 표현됨.
- 원인: 백로그·DayDetail이 하루짜리는 `createRange` 없이 item만 생성. 간트는 `RangeEntity`만 그리며 날짜 단위 폭만 사용.
- 해결: (1) `day` 선택·DayDetail 무기간 추가 시 `createRange(…, d, d)` + item에 `endDate: d`, `rangeId` 연결. (2) `ItemDetail`은 시작일이 있으면 종료일 비어 있어도 `periodEnd = startDate`로 항상 range 유지, `barStartTime`/`barEndTime`을 item 시간과 함께 저장. (3) `RangeEntity`에 `barStartTime`/`barEndTime`, `RangeEditPreview`·`layoutMonthGanttSegments`에서 첫/끝 날 칸 내 분수 폭으로 막대. 같은 칸에서 분수 역전 시 종일 폴백. (4) `RangeDetail`에서 바 시간 편집. `docs/TIMELINE_BARS.md` 반영.
- 재발 방지: 막대 표시는 range와 날짜 스팬을 한 세트로 두고, “하루만”도 `startDate===endDate` range로 통일. 시간 UI 변경 시 미리보기·엔티티·문서 세 곳을 맞출 것.
- 검증: `npm run build` 성공, `npx eslint src/` 0 error 0 warning.
- 관련 파일: `src/utils/timeOfDay.ts`, `src/types/entities.ts`, `src/types/state.ts`, `src/store/board-store.ts`, `src/utils/monthGantt.ts`, `src/components/panels/BacklogPanel.tsx`, `src/components/panels/detail/DayDetail.tsx`, `src/components/panels/detail/ItemDetail.tsx`, `src/components/panels/detail/RangeDetail.tsx`, `docs/TIMELINE_BARS.md`

## [2026-03-23 15:30] 디테일 패널 날짜·시간 단축 버튼 일관성

- 증상: `<input type="time">`는 브라우저에 따라 지우기가 없어 시간을 비울 수 없고, 날짜는 네이티브 피커에 오늘/삭제가 있는 경우가 있어 UX가 어긋남.
- 원인: 시간 필드에 명시적 Clear/Now 미제공.
- 해결: `DetailInputShortcuts`로 **날짜: Today / Clear**, **시간: Now / Clear** 버튼 추가. `ItemDetail`·`DayDetail`·`RangeDetail`에 적용. `formatLocalTimeHHMM`을 `timeOfDay.ts`에 추가. `DetailPanel.css`에 `.detail-mini-btn` 등 스타일 추가.
- 재발 방지: 날짜·시간 편집 UI를 추가할 때 네이티브 피커만 믿지 말고, 비우기·오늘/지금 같은 기본 액션을 버튼으로 제공할 것.
- 검증: `npx tsc --noEmit`, `npx eslint src/`, `npm run build` 성공.
- 관련 파일: `src/components/panels/detail/DetailInputShortcuts.tsx`, `src/utils/timeOfDay.ts`, `src/components/panels/DetailPanel.css`, `src/components/panels/detail/ItemDetail.tsx`, `src/components/panels/detail/DayDetail.tsx`, `src/components/panels/detail/RangeDetail.tsx`

## [2026-03-23 16:00] 디테일 패널 Today/Clear/Now 버튼 롤백

- 증상: 날짜 네이티브 캘린더 하단의「삭제」「오늘」과 동일한 UX를 **시간 입력에도** 원했는데, 디테일 폼 옆에 별도 버튼을 넣은 구현이 의도와 달랐음.
- 원인: `<input type="time">` 팝업은 OS/브라우저 고정 UI라 HTML만으로 날짜 피커와 같은 푸터를 붙일 수 없음. 대안으로 패널에 단축 버튼을 두었으나 사용자는 패널이 아닌 **피커 내부** 일관성을 요구.
- 해결: `DetailInputShortcuts` 삭제, `ItemDetail`·`DayDetail`·`RangeDetail`의 Today/Clear/Now 및 관련 CSS 제거, `formatLocalTimeHHMM` 제거. 날짜·시간은 다시 순수 `<input type="date|time">`만 사용.
- 재발 방지: 네이티브 피커와 동일한 UX가 필요하면 **커스텀 시간 선택 UI**(모달+휠/슬롯+하단 삭제·지금)를 별도 컴포넌트로 설계할 것. 폼 인라인 버튼은 요구사항 확인 후 적용.
- 검증: `npx tsc --noEmit`, `npx eslint src/`, `npm run build` 성공.
- 관련 파일: `src/components/panels/detail/ItemDetail.tsx`, `src/components/panels/detail/DayDetail.tsx`, `src/components/panels/detail/RangeDetail.tsx`, `src/components/panels/DetailPanel.css`, `src/utils/timeOfDay.ts` (`DetailInputShortcuts.tsx` 삭제)

## [2026-03-23 17:10] 디테일 Start/End time 인풋 정렬·너비 불일치

- 증상: `ItemDetail` 등에서 Start time / End time 행마다 라벨 길이가 달라 `<input type="time">`의 왼쪽 시작선과 칸 너비가 서로 다르게 보임.
- 원인: `.detail-time-row`가 `flex`이고 라벨은 내용 너비·`min-width: 36px`만 있어 행마다 라벨 폭이 달라졌고, 인풋은 `flex: 1`로 남는 공간만 차지함.
- 해결: `.detail-time-row`를 `grid`로 바꾸고 라벨 열을 `7.5rem` 고정, 인풋 열은 `minmax(0,1fr)`. `~` 구분 두 칸 행은 `:has(.detail-time-sep)`로 4열 그리드. `.detail-time-input`은 `width:100%` + `min-width:0` + `box-sizing:border-box`.
- 재발 방지: 같은 폼에서 여러 행의 컨트롤 세로 정렬이 필요하면 flex 라벨 자동 너비에만 의존하지 말고 그리드 고정 열 또는 공통 `label` 폭을 둘 것.
- 검증: `npx tsc --noEmit`, `npx eslint src/`, `npm run build` 성공.
- 관련 파일: `src/components/panels/DetailPanel.css`

## [2026-03-23 18:30] Item 반복(repeat) 규칙 + 디테일·보드 연동

- 증상: 일정을 주기적으로 같은 보드 연도 안 여러 날에 표시할 수 없음.
- 원인: `ItemEntity`에 반복 정보 없음, `buildItemDateIndex`가 `item.date` 단일 키만 인덱싱.
- 해결: `ItemRepeatRule`(daily/weekly/monthly/yearly, optional `untilDate`)과 `Item.repeat` 추가. `expandRepeatDateKeys`/`itemOccursOnDate`로 연도 내 발생일 계산. `buildItemDateIndex(items, boardYear)` 확장. `ItemDetail`에서 Repeat·Repeat until 편집(단일일만). 백로그·DayDetail 필터 반영. 기간 막대는 기존처럼 시작일 range만 유지.
- 재발 방지: 반복은 엔티티 필드·인덱스·필터·UI 네 곳을 함께 갱신. 다일 기간과 반복 동시 지원이 필요하면 별도 설계(시리즈 ID 등) 후 구현.
- 검증: `npx tsc --noEmit`, `npx eslint src/`, `npm run build` 성공.
- 관련 파일: `src/types/entities.ts`, `src/utils/repeat.ts`, `src/utils/indexing.ts`, `src/store/board-store.ts`, `src/components/board/YearBoard.tsx`, `src/components/panels/BacklogPanel.tsx`, `src/components/panels/detail/DayDetail.tsx`, `src/components/panels/detail/ItemDetail.tsx`, `docs/IMPLEMENTATION_CHECKLIST.md`

## [2026-03-23 20:15] 반복 UX를 mwohaji_v1에 맞춤 + 반복일 막대

- 증상: 반복이 단순 frequency만 있고, mwohaji의 **N일 간격·요일 다중·월의 날짜 다중·분 간격**이 없음. 반복일에 **기간 막대가 안 그려짐**.
- 원인: 초기 구현을 최소 스키마로만 넣었고, 간트는 `RangeEntity` 원본 한 번만 그렸음.
- 해결: `ItemRepeatRule`을 `kind` 유니온으로 재정의(daily+everyNDays, weekly+weekdays 1–7=월–일, monthly+monthDays, yearly, interval+everyNMinutes+limit). 구 `frequency` 저장분은 `getEffectiveItemRepeat`로 정규화. `ItemDetail`에 mwohaji와 유사한 폼(요일·월일 버튼, 분 간격·횟수). `layoutMonthGanttSegments(ranges, items, …)`에서 반복 발생일마다 하루짜리 synth range로 막대 추가, 원본 range는 `rangeIdsWithRepeatBars`로 한 번 스킵. `interval`은 연간 칸에는 시작일만(알림용에 가깝게).
- 재발 방지: 외부 앱과 UX 패리티 필요 시 원본(예: `mwohaji_v1/js/app.js` repeat-modal) 필드와 1:1 매핑표를 문서에 남길 것. 반복 변경 시 `repeat.ts`·인덱스·간트·디테일 네 곳을 함께 점검.
- 검증: `npx tsc --noEmit`, `npx eslint src/`, `npm run build` 성공.
- 관련 파일: `src/types/entities.ts`, `src/utils/repeat.ts`, `src/utils/monthGantt.ts`, `src/components/board/MonthRow.tsx`, `src/components/board/YearBoard.tsx`, `src/components/panels/detail/ItemDetail.tsx`, `src/components/panels/DetailPanel.css`, `src/components/panels/BacklogPanel.tsx`, `docs/TIMELINE_BARS.md`, `docs/MISTAKE_LOG.md`

## [2026-03-23 21:00] 반복 N주 / N달 간격

- 증상: 매주·매월만 있고 **2주마다·3달마다** 같은 스텝이 없음.
- 원인: `weekly`/`monthly`가 1주·1달 고정으로만 확장됨.
- 해결: `ItemRepeatRule`에 `everyNWeeks?`·`everyNMonths?`(기본 1). 주는 시작일이 속한 주의 **월요일** 기준 `weeksBetweenMondays % N === 0`, 월은 시작 연월 대비 `diffMonths % N === 0`. `ItemDetail`에 숫자 입력. 저장 시 1이면 필드 생략.
- 재발 방지: 주·월 “스텝” 추가 시 `expandRepeatDateKeys`와 `itemOccursOnDate`를 항상 쌍으로 수정.
- 검증: `npx tsc --noEmit`, `npx eslint src/`, `npm run build` 성공.
- 관련 파일: `src/types/entities.ts`, `src/utils/repeat.ts`, `src/components/panels/detail/ItemDetail.tsx`, `docs/TIMELINE_BARS.md`

## [2026-03-24 00:00] 셀 더블클릭 시 왼쪽 패널에 전체 아이템 표시

- 증상: 셀을 더블클릭하면 왼쪽 패널(백로그/디테일)에 해당 날짜 일정만이 아니라 전체 아이템이 표시됨.
- 원인: 더블클릭 시 브라우저가 click 이벤트를 2번 발사. 첫 번째 click이 `selection`을 설정하고, 두 번째 click이 `alreadySelected === true`로 `setSelection(null)` 호출. `handleCellDoubleClick`은 `expandedDateKey`만 토글하고 `selection`을 건드리지 않아 `null` 상태 유지. BacklogPanel은 `selection === null`일 때 전체 아이템을 반환.
- 해결: `handleCellDoubleClick`에서 `setSelection({ type: 'day', dateKey })`를 추가하여 두 번째 click이 지운 selection을 복구.
- 재발 방지: 싱글 클릭이 토글 동작(선택↔해제)을 하는 핸들러와 더블클릭 핸들러가 공존할 때, 더블클릭 = click×2 + dblclick임을 고려하여 dblclick 핸들러에서 의도한 최종 상태를 명시적으로 설정할 것.
- 검증: `npm run build` 성공.
- 관련 파일: `src/components/board/YearBoard.tsx`

## [2026-03-24 10:45] ExpandedCell — 하루 타임라인 + 무시간 리스트

- 증상: (요구) 셀 더블클릭 확장 영역에 **시작 시간이 있는 일정**은 최소 시간 구간 타임라인으로, **시간 없는 일정**은 별도 리스트로 표시. 자정을 넘기는 일정은 당일/익일 구간을 배경·막대 투명도로 구분.
- 원인: (해당 없음 — 신규 기능)
- 해결: `src/utils/dayTimeline.ts`에 `HH:mm` 파싱·구간 집계·겹침 레인 배치. `ExpandedCell`에서 구간 길이에 비례한 타임라인 높이(상·하한), `24:00` 점선·익일 구역 `bg-cell-hover`, 막대를 자정 전후로 분할 렌더. 확장 패널 `onPointerDown`에서 `stopPropagation`으로 보드 팬과 충돌 완화.
- 재발 방지: 시간·자정 오프셋 규칙을 바꿀 때 `dayTimeline.ts`와 `ExpandedCell`을 함께 수정. SVG 위 오버레이는 포인터 이벤트가 보드와 겹치면 전파 차단을 유지할 것.
- 검증: `npx tsc --noEmit`, `npx eslint` (변경 파일), `npm run build` 성공.
- 관련 파일: `src/utils/dayTimeline.ts`, `src/components/board/ExpandedCell.tsx`

## [2026-03-24 12:10] ExpandedCell — 시간축 눈금·range 색·무시간 목록 정리

- 증상: (1) 확장 셀 타임라인에서 구간이 직관적으로 안 읽힘 (2) 막대가 상태색만 사용해 기간에 설정한 색과 불일치 (3) 시간 없는 일정 오른쪽 `task`/`note` 등 kind 표기가 의미 없음.
- 원인: 좌측에 끝시각만 두 줄로 두고 가로 눈금 없음. 막대 fill를 `STATUS_DOT`로만 지정. 리스트 우측에 `item.kind` 출력.
- 해결: `buildTimelineTickTimes`·`timelineTickStep`으로 눈금 시각 집합 생성, 배경 위 가로 그리드 + 좌측 라벨(겹침 시 생략). 상단에 `min–max` 요약. 막대는 `rangeId` 연결 시 `ranges[rid].color`, 없으면 `var(--range-default)` + 완료 시 투명도만 낮춤. 무시간·전체 무시간 리스트에서 kind 컬럼 제거, 점 색은 range 색 우선. `YearBoard`에서 `ranges` 전달.
- 재발 방지: 확장 셀에서 기간 색을 쓰면 보드와 동일하게 `ranges`를 props로 넘길 것. 시간축 UI 추가 시 `dayTimeline`의 눈금 생성과 레이블 충돌 규칙을 함께 조정.
- 검증: `npx tsc --noEmit`, `eslint` 변경 파일, `npm run build` 성공.
- 관련 파일: `src/utils/dayTimeline.ts`, `src/components/board/ExpandedCell.tsx`, `src/components/board/YearBoard.tsx`

## [2026-03-24 14:30] 월 행 기간 막대 — 두께·막대 내 라벨·좁을 때 +N

- 증상: (요구) 기간 막대를 두껍게 하고 막대 안에 기간 이름을 넣되, 공간이 부족하면 `+N` 등으로 겹침을 피하고 싶음.
- 원인: (해당 없음 — UX 개선)
- 해결: `layoutMonthGanttSegments`에 `zoomLevel`을 넘겨 Z0/Z1은 얇은 막대·라벨 없음, Z2+는 막대 높이·하단 패딩을 키우고 `range.label` 없으면 연결 아이템 제목으로 라벨. 너비가 임계값 미만이고 동일 range에 연결된 아이템이 2개 이상이면 `+n`만 표시. 그 외는 픽셀 기준으로 말줄임(`…`). 셀 높이를 넘지 않도록 막대 스택 높이가 맞을 때까지 `barH`/`barGap`을 소폭 축소. `MonthRow`에서 `clipPath`+`text`(역색+얇은 스트로크)로 막대 내부 렌더, `useId` 접두로 clip id 충돌 방지.
- 재발 방지: 간트 막대 시각·라벨 정책을 바꿀 때 `monthGantt.ts`의 줌별 메트릭·`computeBarLabel`과 `MonthRow` SVG를 함께 수정할 것. `layoutMonthGanttSegments` 시그니처 변경 시 호출부(현재 `MonthRow`) 동기화.
- 검증: `npx tsc --noEmit` 통과, 변경 파일 eslint 이슈 없음.
- 관련 파일: `src/utils/monthGantt.ts`, `src/components/board/MonthRow.tsx`

## [2026-03-24 16:00] 기간 막대 — 날짜 가림·리스트 겹침·라벨 중복

- 증상: 막대 라벨과 셀 안 요약 텍스트가 겹쳐 보임. 막대가 날짜 숫자까지 덮음. 하단 `+N`·상태 점이 막대와 겹침. 같은 날·같은 range가 여러 트랙에 쌓일 때 바 안 이름이 반복됨.
- 원인: 막대가 셀 전체 높이(28) 아래에서부터 쌓여 상단 여백이 없음. 요약/진행률은 타임라인과 독립 렌더. 라벨은 트랙마다 개별 계산.
- 해결: `BASE_CELL_HEIGHT` 34로 상향. `GANTT_RESERVED_TOP`(13.5) 이상으로 막대 스택 꼭대기가 올라가지 않게 `barH`/`barGap` 자동 축소. Z2–Z4 기본 막대·폰트·간격을 다소 촘촘히. 같은 `startKey===endKey`+`rangeId` 그룹은 **track 번호가 가장 작은 막대(아래쪽)만** 라벨 유지. `dateKeysUnderGanttBars`로 막대가 지나가는 날은 `DayCell`에서 요약·진행률·hidden `+N` 숨김, 상태 점은 `cy=10`으로 이동.
- 재발 방지: 타임라인 막대 레이아웃을 바꿀 때 `GANTT_RESERVED_TOP`·셀 높이·`suppressListUnderGantt` 정책을 함께 점검. 반복 일정으로 같은 날 동일 range가 여러 막대가 되면 라벨 중복은 `dedupeStackedSingleDayRangeLabels`에 맡길 것.
- 검증: `npx tsc --noEmit`, eslint 변경 파일, `npm run build` 성공.
- 관련 파일: `src/utils/zoom.ts`, `src/utils/monthGantt.ts`, `src/components/board/DayCell.tsx`, `src/components/board/MonthRow.tsx`

## [2026-03-24 17:10] 간트 — 같은 좌표 막대 다중 오버레이 시 겹침 개수 표시

- 증상: 트랙이 부족해 같은 줄(같은 rect)에 막대가 여러 개 그려지면 색만 진해지고 라벨이 겹쳐 읽을 수 없음.
- 원인: `!placed`일 때 모두 마지막 트랙에 `push`만 하고 기하가 동일한 `rect`가 N번 중첩됨.
- 해결: 레이아웃 후 `mergeCoincidentBarRects`로 동일 `(track,x,y,width,height)`(1/8 단위 반올림) 그룹을 **한 개의 막대**로 합치고, 라벨은 **겹친 개수(숫자)**만 중앙 표시. `MonthGanttSegment.labelCentered`로 텍스트 `textAnchor=middle`.
- 재발 방지: 오버플로 트랙에 쌓이는 경우를 시각적으로 합칠 때 기하 키 반올림과 합친 뒤 `rangeId`(React key) 유일성을 함께 확인할 것.
- 검증: `npx tsc --noEmit`, eslint, `npm run build` 성공.
- 관련 파일: `src/utils/monthGantt.ts`, `src/components/board/MonthRow.tsx`

## [2026-03-24 18:05] 간트 겹침 — 최상단 라벨·+n·색 블렌드

- 증상: 겹침을 숫자만으로 표시해 직관이 부족하고, 기간 막대와 단일일 막대가 같은 셀에서 섞일 때 의미가 불명확함.
- 원인: 동일 rect 병합 시 단일 불투명 막대+숫자만 사용.
- 해결: 겹침 그룹을 `timelinePriority` 오름차순(낮은 값이 아래)·동률이면 `createdAt` 오름차순(먼저 만든 것이 아래)으로 쌓고, **맨 위 range**의 `labelForRange` 텍스트에 **` +n`**(아래에 깔린 개수)을 붙임. 같은 rect에는 **여러 `rect`를 kind별 반투명(opacity ~0.42–0.52)**으로 겹쳐 색이 섞이게 렌더. `MonthGanttSegment.stackLayers`+`MonthRow`에서 다층 그리기.
- 재발 방지: “위에 온 것” 정의를 바꾸면 `compareRangeStackBottomOrder`와 UI 문구를 함께 맞출 것. 겹침 라벨 폭은 `barWidth`에 맞춰 말줄임 유지.
- 검증: `npx tsc --noEmit`, eslint, `npm run build` 성공.
- 관련 파일: `src/utils/monthGantt.ts`, `src/components/board/MonthRow.tsx`

## [2026-03-24 19:00] 간트 — 여러 날 막대 라벨을 막대 중앙(옆 칸 쪽)으로

- 증상: 긴 기간 막대도 라벨이 항상 시작일 칸 왼쪽에만 붙어, 같은 날 다른 막대 라벨과 시각적으로 몰림.
- 원인: 텍스트를 세그먼트 `x` 기준 시작 정렬만 사용.
- 해결: `dayStart !== dayEnd`이고 막대 너비가 한 칸보다 크면 `labelTextAnchor: 'middle'`, `MonthRow`에서 `x = x + width/2`·`textAnchor=middle`. 겹침 병합(`stackLayers`)은 시작 정렬 유지.
- 재발 방지: 라벨 위치 정책을 바꿀 때 단일일/다일·병합 세 경우를 함께 테스트할 것.
- 검증: `npx tsc --noEmit`, eslint, `npm run build` 성공.
- 관련 파일: `src/utils/monthGantt.ts`, `src/components/board/MonthRow.tsx`

## [2026-03-24 20:15] 간트 — 다일 막대 라벨 충돌 회피(날짜 칸 중심 후보)

- 증상: 단순 중앙 정렬만으로는 시작일 칸에 몰린 다른 라벨과의 겹침이 남음.
- 원인: 라벨 x를 막대 전체 중앙 하나로 고정.
- 해결: `resolveMultiDayLabelAnchors`로 막대가 덮는 **각 날짜 칸의 중심**(막대 구간으로 클램프)을 후보로 두고, 같은 `y`의 다른 세그먼트 라벨 구간(추정 폭)과 수평 겹침 수가 최소인 후보를 선택·동률이면 더 오른쪽 후보. **넓은 막대부터** 배정. `labelAnchorX`+`textAnchor=middle`로 렌더.
- 재발 방지: 라벨 폭 추정(`estimateLabelWidth`)·후보 집합을 바꾸면 단일일/스택/다일 조합을 함께 확인할 것. 전역 최적·세로 인접 트랙까지의 충돌은 범위 밖.
- 검증: `npx tsc --noEmit`, eslint, `npm run build` 성공.
- 관련 파일: `src/utils/monthGantt.ts`, `src/components/board/MonthRow.tsx`

## [2026-03-24 21:00] 간트 라벨 — 충돌 회피 제거, 다일만 막대 중앙

- 증상: (요구) 날짜 칸별 라벨 후보·겹침 최소화 로직은 보류하고 단순화.
- 원인: (해당 없음 — 의도적 되돌림)
- 해결: `resolveMultiDayLabelAnchors`·`estimateLabelWidth`·`labelAnchorX` 제거. 다일 막대는 기존처럼 `labelTextAnchor: 'middle'` + `x + width/2`만 사용.
- 재발 방지: 라벨 배치를 다시 설계할 때 이 항목과 `[2026-03-24 20:15]` 참고.
- 검증: `npx tsc --noEmit`, eslint, `npm run build` 성공.
- 관련 파일: `src/utils/monthGantt.ts`, `src/components/board/MonthRow.tsx`

## [2026-03-24 22:00] DayCell — 상태 점 위치 피리오드 바 ON 기준으로 고정

- 증상: 타임라인(피리오드) 바 표시 ON/OFF에 따라 우상단 상태 원 `cy`가 `10` vs `h-4`로 달라짐.
- 원인: `suppressListUnderGantt`일 때만 `cy=10`으로 올려 막대와 겹침을 피하도록 분기.
- 해결: 상태 원은 항상 `cy={10}` (`cx=w-4` 유지)으로 통일.
- 재발 방지: 셀 높이·줌 정책 바꿀 때 날짜 숫자(y≈9)와 원(10) 간격을 한 번 확인할 것.
- 검증: `npx tsc --noEmit`, eslint `DayCell.tsx`.
- 관련 파일: `src/components/board/DayCell.tsx`

## [2026-03-24 23:00] 필터·간트 — 보이는 아이템에만 기간 막대 + 토글 의미 통일

- 증상: Hide done ON인데 완료만 연결된 기간 막대는 남음. 필터에서 Hide done은 “켜면 숨김”인데 Period bars는 “켜면 보임”이라 토글 의미가 반대로 느껴짐.
- 원인: `layoutMonthGanttSegments`가 `ranges` 전체를 돌며 `items`는 필터된 것만 넘어와도 막대는 링크 여부를 보지 않음.
- 해결: `rangeHasLinkedItemInBoardItems`로 필터 통과 아이템이 `rangeId`를 가질 때만 본문 막대 raw에 넣음. `FilterPanel`: Hide done 행에 `Hidden`/`Visible` 힌트 추가, Period는 라벨을 **Hide period bars**로 바꾸고 토글 **active**·`aria-checked`를 `!showTimelineBars`로 맞춰 “켜면 숨김”과 일치.
- 재발 방지: 보드에 넘기는 `items`와 간트 레이아웃 입력이 항상 동일 필터를 쓰는지 확인. 스토어 필드명 `showTimelineBars`는 유지(의미는 그대로).
- 검증: `npx tsc --noEmit`, eslint 변경 파일.
- 관련 파일: `src/utils/monthGantt.ts`, `src/components/panels/FilterPanel.tsx`

## [2026-03-24 23:45] 타임라인 — 멀티데이·싱글데이 기간 막대 표시 분리

- 증상: (요구) 하루짜리 막대만 가끔 보이게 하거나, 여러 날 막대만 숨기고 싶은데 기존 `showTimelineBars` 하나로는 개별 제어 불가.
- 원인: 필터가 기간 막대 on/off를 단일 불리언으로만 저장·렌더.
- 해결: `BoardViewFilter`에 `showTimelineBarsMultiDay`·`showTimelineBarsSingleDay` 추가(기본 둘 다 true). `normalizeBoardViewFilter`에서 레거시 `showTimelineBars`를 읽어 둘 다 끔/켬으로 마이그레이션. `layoutMonthGanttSegments`에 `spanVisibility`로 클립이 이 달에서 하루인지 여부(`dayStart !== dayEnd`)·반복 synth(항상 싱글데이)에 따라 raw 스킵. `FilterPanel`에 토글 두 줄. `MonthRow`는 둘 중 하나라도 켜면 간트 레이어·`suppressListUnderGantt` 유지.
- 재발 방지: 간트에 새 가시성 차원을 넣을 때 `YearBoard`→`MonthRow`→`layoutMonthGanttSegments`와 저장 스키마·정규화를 함께 갱신할 것.
- 검증: `npx tsc --noEmit`, eslint(변경 파일), `npm run build` 성공.
- 관련 파일: `src/types/state.ts`, `src/utils/boardViewFilter.ts`, `src/utils/monthGantt.ts`, `src/components/panels/FilterPanel.tsx`, `src/components/board/MonthRow.tsx`, `src/components/board/YearBoard.tsx`

## [2026-03-25 00:10] 타임라인 — 칸 안 시간(하루 미만) 막대 폭 온오프

- 증상: (요구) `barStartTime`/`barEndTime`으로 칸 안에서 잘리는 막대(시간 단위)만 따로 끄고 싶음.
- 원인: 멀티/싱글데이 토글만 있고 시각 폭 제어는 없음.
- 해결: `BoardViewFilter.showTimelineBarsTimeOfDay`(기본 true) + `FilterPanel` **Hide time-of-day on period bars**. 동작은 아래 `[00:25]`에서 **미표시**로 확정(초안은 종일 폭이었음).
- 재발 방지: “숨김” 문구와 실제 동작(스킵 vs 종일 폭)을 함께 검토할 것.
- 검증: `npx tsc --noEmit`, eslint(변경 파일), `npm run build` 성공.
- 관련 파일: `src/types/state.ts`, `src/utils/boardViewFilter.ts`, `src/utils/monthGantt.ts`, `src/components/panels/FilterPanel.tsx`, `src/components/board/MonthRow.tsx`, `src/components/board/YearBoard.tsx`

## [2026-03-25 00:25] 타임라인 — “시간 막대 끄기”를 종일 폭이 아니라 미표시로 수정

- 증상: `showTimelineBarsTimeOfDay` off 시 막대를 종일 폭으로 그려 달력은 복잡해지고, 사용자는 **아예 안 그리기**를 기대함.
- 원인: 첫 구현이 “시각 무시·셀 전체 너비”로 해석됨.
- 해결: `segmentUsesTimeOfDayClip`로 `startCellFrac`/`endCellFrac`가 종일(0~1)이 아닌 세그먼트를 판별. `showTimeOfDay`가 false면 해당 raw는 **continue**로 제외. 본문 range·반복 synth 동일.
- 재발 방지: 필터 문구(“Hide time-of-day…”)와 실제 동작(숨김 vs 단순화)을 바꿀 때 PR/설명 한 줄로 맞출 것.
- 검증: `npx tsc --noEmit`, eslint `src/utils/monthGantt.ts`, `npm run build` 성공.
- 관련 파일: `src/utils/monthGantt.ts`, `src/types/state.ts`

## [2026-03-25 00:40] 타임라인 — Hide time-of-day 시 다일(시간 지정) 막대 복구

- 증상: 시간 토글 off 시 `startDate !== endDate`인 기간도 통째로 숨겨짐. 사용자는 **하루 칸 안 짧은 막대만** 숨기길 원함.
- 원인: 클립이 칸 안 시간만 보면 다일·월경계(한 달에 한 칸만 보임)를 구분하지 못함.
- 해결: `resolveFracsForTimeOfDayToggle`에서 `range.startDate !== range.endDate` **또는** 이 달 클립이 여러 칸이면 `0~1`로 단순화해 막대 유지. 위 둘 다 아니고 단일일+시간 클립일 때만 `null` 스킵.
- 재발 방지: 월별 클립과 엔티티 달력 구간을 섞어 판단할 때 두 축을 모두 적을 것.
- 검증: `npx tsc --noEmit`, eslint `monthGantt.ts`·`state.ts`, `npm run build` 성공.
- 관련 파일: `src/utils/monthGantt.ts`, `src/types/state.ts`

## [2026-03-25 00:50] 타임라인 — 다일 막대 0~1 확장 제거(시간 폭 유지)

- 증상: Hide time-of-day on 시 다일+시간 지정 막대가 끝 칸이 **종일 폭으로 펼쳐짐**. 사용자는 숨김만 원했지 폭 왜곡을 원하지 않음.
- 원인: `[00:40]`에서 다일을 막 살리려 `startCellFrac`/`endCellFrac`를 강제 `0~1`로 둠.
- 해결: 토글 off일 때 **단일일·이 달 한 칸 스트립**에서만 시간 클립이면 `null` 스킵. 그 외(다일 또는 달 안 여러 칸)는 **계산된 분수 그대로** 반환. UI 라벨 **Hide same-day time bars**로 의미 정렬.
- 재발 방지: “막대 보이게”와 “시간 숨김”을 **0~1 확장**으로 퉁치지 말고, 스킵 vs 그대로 두 명세를 분리할 것.
- 검증: `npx tsc --noEmit`, eslint 변경 파일, `npm run build` 성공.
- 관련 파일: `src/utils/monthGantt.ts`, `src/types/state.ts`, `src/components/panels/FilterPanel.tsx`

## [2026-03-25 01:05] 타임라인 — Hide single-day = 종일 하루만 숨김, 시간 막대 유지

- 증상: (요구) Hide single-day period bars 시 **시간 미지정(종일)** 하루 막대만 없애고, bar 시간이 있는 하루 막대는 남기고 싶음.
- 원인: `showTimelineBarsSingleDay` false면 이 달 한 칸 클립·반복 일칸을 전부 스킵.
- 해결: 한 칸 클립에서 `cellTimeFractionsForClip` 후 `segmentUsesTimeOfDayClip`이 false(종일)일 때만 스킵. 반복 루프는 `singleDay` off여도 동일 규칙으로 돌림. `multiDay`·`singleDay` 둘 다 off여도 timed 단일이 나올 수 있어 상단 `return []` 제거. `MonthRow`는 `ganttSegments.length > 0`일 때만 간트 `<g>` 렌더. 라벨 **Hide all-day single-day bars**.
- 재발 방지: 싱글데이 토글이 “전부 끔”이 아니라 “종일만 끔”이면 레이아웃·빈 간트 early return·UI 문구를 함께 맞출 것.
- 검증: `npx tsc --noEmit`, eslint 변경 파일, `npm run build` 성공.
- 관련 파일: `src/utils/monthGantt.ts`, `src/types/state.ts`, `src/components/board/MonthRow.tsx`, `src/components/panels/FilterPanel.tsx`

## [2026-03-25 01:25] ExpandedCell — 세로 타임라인에 막대 **오른쪽** 물결 롤백

- 증상: 확장 셀 타임라인은 **위→아래** 시간축인데 막대 끝을 오른쪽 물결로 처리해 방향이 어긋남.
- 원인: 가로 막대(간트)처럼 보이게 오른쪽 가장자리만 꾸밈.
- 해결: `[01:20]` 물결·`addDaysToDateKey` 등 해당 구현 제거, 막대는 기존 `rect`만. 이후 “계속됨”은 **하단** 가장자리·아이콘·캡션 등 세로축에 맞는 패턴으로 재설계 검토.
- 재발 방지: 타임라인 축 방향을 먼저 정한 뒤 종료/연속 시각 언어를 맞출 것.
- 검증: 당시 롤백 후 물결 코드 없음(이후 `[01:35]`에서 하단 물결 재도입).
- 관련 파일: (롤백) `src/components/board/ExpandedCell.tsx`, `src/utils/date.ts`

## [2026-03-25 01:35] ExpandedCell — 세로 타임라인 막대 **하단** 가로 물결(계속됨)

- 증상: (요구) 장기 야간 일정이 이 날 뷰에서 끝나 보이는 오해. 물결은 **세로축 끝=아래**에.
- 원인: `[01:25]`에서 오른쪽 물결 제거만 하고 대체 시각 미구현.
- 해결: 자정 넘김·`endDate` &gt; `dateKey+1일`이면 **마지막 막대 조각**을 위쪽 `rect` + 하단 `continuationWaveBottomD` path로 분리. 막대 낮으면 `amp` 축소·물결 생략. `addDaysToDateKey` 복구.
- 재발 방지: 타임라인은 위→아래; “연속” 장식은 **수평 변조(하단)** 에만 둘 것.
- 검증: `npx tsc --noEmit`, eslint `ExpandedCell.tsx`·`date.ts`, `npm run build` 성공.
- 관련 파일: `src/components/board/ExpandedCell.tsx`, `src/utils/date.ts`

## [2026-03-25 01:40] ExpandedCell — 하단 물결 스플라인(직선 다각형 제거)

- 증상: 하단 물결이 `L` 연결로 각져 보이고 양끝 이음이 거침.
- 원인: 샘플 점을 직선으로만 잇음; 끝 위상이 맞지 않으면 모서리 깨짐.
- 해결: `y = yFlat + amp·sin²(π·cycles·u)`(정수 `cycles`, `u∈[0,1]`에서 양끝 `yFlat`) 후 샘플을 **우→좌**로 Catmull–Rom→cubic `C` 체인. `strokeLinejoin`/`cap` round, `shapeRendering="geometricPrecision"`.
- 재발 방지: 부드러운 장식 경로는 베지어 스플라인 또는 고해상도 단일 곡선으로; 끝점은 기하적으로 닫히게 설계.
- 검증: `npx tsc --noEmit`, eslint `ExpandedCell.tsx`, `npm run build` 성공.
- 관련 파일: `src/components/board/ExpandedCell.tsx`

## [2026-03-25 01:45] ExpandedCell — 계속됨 표시를 물결→하단 그라데이션 페이드로

- 증상: (요구) 물결 path가 미관상 별로; 그라데이션·블러 느낌이 더 낫고 단순했으면 함.
- 원인: `[01:35]`~`[01:40]` 물결/스플라인 기반.
- 해결: 동일 조건(`segmentNeedsContinuationHint`)에서 위는 기존 `rect`, 아래 띠는 `linearGradient`(위→아래 불투명→투명, `stopColor`는 막대와 동일). 물결·Catmull 코드 제거. `useId`로 gradient id 충돌 방지.
- 재발 방지: 세로 타임라인 “소멸” 연출은 opacity 그라데이션이 가장 단순; 진짜 `feGaussianBlur`는 비용·번짐 이슈 있어 필요 시만.
- 검증: `npx tsc --noEmit`, eslint `ExpandedCell.tsx`, `npm run build` 성공.
- 관련 파일: `src/components/board/ExpandedCell.tsx`

## [2026-03-25 01:50] ExpandedCell — 계속됨 페이드 단일 rect(모서리 홈 제거)

- 증상: 위 `rect`(rx) + 아래 그라데이션 띠 이음에서 양옆 위에 흰 홈·틈처럼 보임.
- 원인: 둥근 아래변과 직사각 띠의 기하 불일치.
- 해결: 페이드 시 **막대 하나**만 두고 `fill=linearGradient`(objectBoundingBox, 막대 높이 기준 아래쪽만 흐림) + 동일 `rx=1`. 분리 rect 제거.
- 재발 방지: 모서리가 있는 도형에 덧붙인 띠는 피하고, 단일 도형+그라데이션으로 통합.
- 검증: `npx tsc --noEmit`, eslint `ExpandedCell.tsx`, `npm run build` 성공.
- 관련 파일: `src/components/board/ExpandedCell.tsx`

## [2026-03-25 01:55] ExpandedCell — 계속됨 페이드 시 stroke가 남는 문제(마스크로 통합)

- 증상: `fill`만 그라데이션으로 투명해지면 `stroke`는 불투명이라 아래가 비어 보이는데 회색 테두리만 남음(U자 트레이 느낌).
- 원인: SVG에서 `fill` 그라데이션은 채우기만 바꾸고 외곽선은 그대로 그려짐.
- 해결: 막대는 단색 `fill`+`stroke` 유지, `mask` 안에 흰색 세로 그라데이션(objectBoundingBox)으로 **채우기·테두리를 함께** 아래로 페이드. `maskGradId`/`fadeMaskId`를 `useId` 접두와 세그먼트별로 분리.
- 재발 방지: “전체가 사라지는” 연출은 fill 알파만 쓰지 말고 마스크(또는 clip+그룹 opacity)로 도형 전체에 적용할지 먼저 판단.
- 검증: `npx tsc --noEmit`, `npm run build` 성공, `ExpandedCell.tsx` 린트 이상 없음.
- 관련 파일: `src/components/board/ExpandedCell.tsx`

## [2026-03-25 02:05] ExpandedCell — 계속됨 마스크 페이드를 더 완만하게

- 증상: 페이드 구간이 픽셀 상한(~3px) 위주라 멀리서 보면 끊김과 구분이 어려움.
- 원인: `fadeH = min(baseFadeH, …)`로 긴 막대도 하단 몇 픽셀만 그라데이션; 마스크 스톱도 구간 대비 급격함.
- 해결: `fadeH = min(p.h·0.58, max(2.2, p.h·0.36))`로 높이 비율 기반(대략 하단 36~58% 구간에서 소멸). 마스크는 22/48/76% 지점에 중간 알파(0.82→0.38→0.1)로 곡선형 페이드.
- 재발 방지: 타임라인 막대 페이드는 픽셀 상한만 두지 말고 `p.h` 비율로 최소 전환 길이를 확보.
- 검증: `npx tsc --noEmit`, `npm run build` 성공.
- 관련 파일: `src/components/board/ExpandedCell.tsx`

## [2026-03-25 02:12] ExpandedCell — 자정 분할 막대 이음면 둥근 모서리 제거

- 증상: `barParts`로 위·아래 두 `rect`에 동일 `rx`를 주면 점선(자정)에서 캡슐 두 개가 붙은 것처럼 보여 끊김 강조.
- 원인: 맞닿는 가로변까지 라운드 처리됨.
- 해결: `timelineBarPathD`로 막대를 그림. 첫 조각은 위쪽만·마지막 조각은 아래쪽만 `BAR_RX` 적용, 중간 이음은 직각. 단일 조각은 네 모서리 유지.
- 재발 방지: 타임라인에서 구간 분할 시 “바깥” 모서리만 라운드할지 분기할 것.
- 검증: `npx tsc --noEmit`, `npm run build` 성공.
- 관련 파일: `src/components/board/ExpandedCell.tsx`

## [2026-03-25] 문서 정합성 — PRD·체크리스트·수정 로그

- 증상: 구현 체크리스트의 `select → range` 미체크·v2.0 문구가 “기간 미구현”“셀 클릭→디테일”로 오해됨. PRD는 우측=상세 초안과 실제(좌측 detail·백로그 자동 포커스)가 불일치.
- 원인: draw 모드 range 제거 후 체크리스트·PRD가 부분만 갱신됨. Filter 패널 구현 후에도 `[ ]`로 남아 있음.
- 해결: `IMPLEMENTATION_CHECKLIST.md`에서 기간 생성 경로·Phase 2/3·v3.0~3.1·파일 목록 정리. `prd_v2.md` §6.4·§6.5, `prd_v2_ux.md` §7·§13·§14에 현재 셸·백로그 자동 포커스·`days` placeholder 명시. `PRD_CHANGELOG.md`에 [2026-03-25] 항목 추가.
- 재발 방지: 제스처/패널 동작을 바꾸면 체크리스트·PRD_CHANGELOG·본문 PRD를 한 묶음으로 갱신할 것. “미구현” 줄은 **무엇이 아직 없는지** 한 문장으로 적을 것.
- 검증: 문서만 변경; 코드 빌드는 생략. 앵커 링크는 뷰어에 따라 한글 제목 slug가 다를 수 있음.
- 관련 파일: `docs/IMPLEMENTATION_CHECKLIST.md`, `docs/PRD_CHANGELOG.md`, `docs/prd_v2.md`, `docs/prd_v2_ux.md`, `docs/MISTAKE_LOG.md`

## [2026-03-25] 문서 — `days` 전용 Detail 인스펙터 항목 제거

- 증상: 체크리스트·PRD에 `days`만 선택했을 때 Detail 전용 폼을 미구현으로 적어 두어, 실제 제품 방향(range는 기존 RangeDetail에서 편집)과 어긋남.
- 원인: 앞서 오해 방지용으로 placeholder를 문서화했으나, 사용자 결정은 “전용 인스펙터 없음”.
- 해결: Phase 2 해당 `[ ]` 삭제, v3.0 주석·`prd_v2` §6.4·`prd_v2_ux` §13·`PRD_CHANGELOG` 후속 항목으로 **의도적으로 두지 않음** 명시.
- 재발 방지: “나중에 만들 수도”와 “미구현 TODO”를 구분할 것. 안 만들 것은 체크리스트에 넣지 않는다.
- 검증: 문서만 수정.
- 관련 파일: `docs/IMPLEMENTATION_CHECKLIST.md`, `docs/PRD_CHANGELOG.md`, `docs/prd_v2.md`, `docs/prd_v2_ux.md`, `docs/MISTAKE_LOG.md`

## [2026-03-25] Tags 패널 — 새 태그 추가

- 증상: Tags 메뉴에서 태그 이름 변경·삭제만 가능하고, 보드에 없는 태그를 미리 만들 수 없음.
- 원인: 태그가 item.tags에만 존재하는 모델이라 UI에 생성 진입이 없었음.
- 해결: 입력란 + 버튼으로 `createItem(..., { tags: [name], title: '' })` 호출. 중복·빈 이름 검사 및 안내 문구 추가.
- 재발 방지: “태그만” 추가할 때는 스키마상 item 한 건이 필요함을 사용자에게 intro에 명시할 것.
- 검증: `npx tsc --noEmit`, 대상 파일 린트 확인.
- 관련 파일: `src/components/panels/TagsPanel.tsx`, `src/components/panels/TagsPanel.css`, `docs/MISTAKE_LOG.md`

## [2026-03-25] 전역 단축키·JSON 가져오기·undo 히스토리 스냅샷

- 증상: (1) 오버레이 선택 후 Delete/Backspace·⌘Z가 없음. (2) 설정에서 JSON 가져오기 시 보드만 교체·설정은 별도 `updateSettings`라 undo 한 번으로 되돌리기 어렵고, `replaceBoardsState`가 히스토리를 비워 undo 스택이 사라짐. (3) 히스토리에 설정을 항상 넣으면 “항목 추가 후 필터 변경 → undo” 시 필터까지 과거로 돌아가는 회귀.
- 원인: 앱 레벨 키보드 핸들러 미구현. 가져오기가 두 액션으로 쪼개짐. 초기 `replaceBoardsState` 설계가 `historyPast` 전체 삭제를 동반. undo 스냅샷을 설정까지 항상 포함하면 일반 편집과 설정 UI가 같은 스택에서 섞임.
- 해결: `App.tsx`에 ⌘/Ctrl+Z·Shift+Z(되돌리기/다시 실행), 입력·contentEditable 제외 시 오버레이 선택 + Delete/Backspace로 `deleteOverlay`. 설정 패널은 `importBoardsAndSettings`로 보드+설정을 한 번에 적용. `HistorySnap`에 선택적 `settings` 필드: 일반 `maybePushHistory`는 보드만 스냅, 가져오기만 `snapshotBoardsAndSettings`로 이전 설정 포함·undo 시 복원. `replaceBoardsState`는 히스토리 전체 삭제 제거(한 스텝 undo 가능). persist `migrate` 미사용 `version` 인자는 `_version`으로 TS 경고 제거.
- 재발 방지: “설정까지 undo”가 필요한 연산(전체 가져오기)과 “보드만 undo”가 필요한 연산을 스냅샷 형태로 구분할 것. 전역 단축키는 입력 포커스·contentEditable을 반드시 제외할 것.
- 검증: `npx tsc -b`·`npm run lint` 성공. `YearBoard`/`OverlayDetail`은 렌더 중 ref·effect setState ESLint 규칙에 맞게 정리.
- 관련 파일: `src/App.tsx`, `src/components/panels/SettingsPanel.tsx`, `src/store/board-store.ts`, `src/components/board/YearBoard.tsx`, `src/components/panels/detail/OverlayDetail.tsx`, `docs/MISTAKE_LOG.md`

## [2026-03-25] zustand persist 콜백 닫는 괄호·쉼표

- 증상: `board-store`에서 `persist((set,get)=>{ return {…} }, { … })`로 바꾼 뒤 `TS1128 Declaration or statement expected`.
- 원인: 첫 인자 화살표 함수 본문을 `}` 두 번(리턴 객체·함수 본문)으로 닫은 뒤 `persist` 두 번째 인자 객체 앞에 **쉼표만** 있어야 하는데 `),`로 첫 인자를 잘못 종료하거나 `}` 하나가 빠짐.
- 해결: `importBoardsAndSettings` 다음에 `},` → `}`(return 객체) → `}`(화살표 본문) → `,` → `{ name, migrate, … }` → `)` `)` 순으로 정리.
- 재발 방지: `persist`를 객체 리터럴 반환 형태로 바꿀 때 닫는 중괄호·괄호·쉼표를 한 줄씩 주석으로 검증할 것.
- 검증: `npx tsc -b`, `npm run lint`, `npm run build` 성공.
- 관련 파일: `src/store/board-store.ts`, `docs/MISTAKE_LOG.md`

## [2026-03-25] Draw 플라이아웃·오버레이 리사이즈·YearBoard 스트로크 미리보기

- 증상: `YearBoard`에 존재하지 않는 `strokeForPenLikeTool`·`settingsDrawPenColor` 참조로 타입/런타임 오류 위험. Draw 모드에서 형광펜 색·굵기·도형 테두리/채움/굵기 조절 UI 부재. JSON 가져오기 시 `drawPenWidthWeight` 등 신규 설정이 기본값으로 덮이지 않고 누락될 수 있음.
- 원인: 오버레이 그리기 헬퍼 교체 후 일부 파일만 갱신됨. 툴바는 펜 색만 노출·형광펜 고정 문구 잔존. Import 병합 객체에 v6 필드 미포함.
- 해결: 미리보기를 `penStroke`/`highlighterStroke`와 `drawUi`로 통일. `TopToolbar`에 펜·형광펜·사각/타원 전용 스와치·굵기 버튼. 오버레이 리사이즈 종료 시 `updateOverlay`로 크기 확정. `SettingsPanel`에 draw 관련 필드 정규화 병합. `OverlayDetail`에서 도형 선색·굵기·채우기 편집.
- 재발 방지: `AppSettings` 필드 추가 시 persist migrate·JSON import·툴바를 함께 갱신하고, 제거된 심볼이 남았는지 저장 전 ripgrep으로 확인.
- 검증: `npx tsc -b`, `npm run lint`, `npm run build` 성공.
- 관련 파일: `src/components/board/YearBoard.tsx`, `src/components/board/BoardOverlays.tsx`, `src/components/toolbar/TopToolbar.tsx`, `src/components/toolbar/TopToolbar.css`, `src/components/panels/SettingsPanel.tsx`, `src/components/panels/detail/OverlayDetail.tsx`, `src/components/panels/DetailPanel.css`, `docs/MISTAKE_LOG.md`

## [2026-03-25] OverlayDetail — zustand 선택자 스냅샷 무한 루프 (React 19)

- 증상: 오버레이 선택 시 콘솔에 `getSnapshot should be cached`, `Maximum update depth exceeded`. `<OverlayDetail>`에서 크래시.
- 원인: `useBoardStore` 선택자가 `Object.values().map().sort()`로 **매 호출마다 새 배열**을 반환. React `useSyncExternalStore`는 참조가 바뀌면 스냅샷 변경으로 간주해 재렌더를 반복. `activeBoardId` 없을 때 매번 새 `[]`를 반환한 것도 동일.
- 해결: 스토어에서는 `boards[id]?.items` **객체 참조**만 구독하고, 정렬·맵은 `useMemo([boardItems])`로 계산. 빈 목록은 모듈 상수 `EMPTY_ITEM_LIST` 재사용.
- 재발 방지: zustand `useStore` 선택자는 “스토어에 저장된 참조 그대로” 또는 원시값만 반환하고, 파생 배열/객체는 `useMemo`·`useShallow`(얕은 동일 시)로 안정화할 것.
- 검증: `npx tsc -b`, `npm run lint` 성공.
- 관련 파일: `src/components/panels/detail/OverlayDetail.tsx`, `docs/MISTAKE_LOG.md`

## [2026-03-25] OverlayDetail — React 19 스냅샷 루프 재발 (선택자 클로저·useShallow)

- 증상: `itemList` useMemo 이후에도 `getSnapshot should be cached`, `Maximum update depth`가 메모 디테일 진입 시 재현.
- 원인: (1) `overlay` 선택자가 렌더마다 새 함수로 외부 `overlayId`를 클로저해 `useSyncExternalStore` 스냅샷이 흔들릴 수 있음. (2) `useShallow`가 매 렌더 새 선택자 함수를 반환해 zustand `useStore`의 `useCallback(..., [selector])`가 계속 무효화됨(React 19와 부정적 상호작용 가능). (3) `items`가 없을 때 `?? {}` 류가 있으면 매 스냅샷 새 객체가 될 수 있음.
- 해결: `useShallow` 제거. `overlay`는 `s.selection`·`s.activeBoardId`만으로 `getState()` 경로에서 계산. `boardItems`는 `s.boards[id]?.items ?? EMPTY_ITEMS`로 빈 경우 고정 참조. `itemList`는 기존처럼 `useMemo([boardItems])`.
- 재발 방지: zustand 선택자는 **스토어 인자 `s`만** 사용해 파생하고, 객체 리터럴·매번 새 `[]`/`{}`를 선택자 반환값으로 쓰지 말 것. `useShallow`는 선택자 참조 안정성을 확인한 뒤만 사용.
- 검증: `npx tsc -b`, `npm run lint` 성공.
- 관련 파일: `src/components/panels/detail/OverlayDetail.tsx`, `docs/MISTAKE_LOG.md`

## [2026-03-31] 포스트잇 Place 직후 글쓰기·왼쪽 디테일

- 증상: Place로 포스트잇을 찍은 뒤 Select로 바꿔 메모를 눌러야 디테일에서 본문 입력 가능.
- 원인: Place 모드에서 오버레이 `pointer-events` 없음 + 생성 후 `setSelection`/패널/모드 전환이 없음. `toggleLeftPanel('detail')`는 이미 디테일이면 패널을 닫아 버림.
- 해결: 메모만 `createOverlay` id로 `setSelection`·`setInteractionMode('select')`·`ensureLeftPanelOpen('detail')`. 스토어에 `ensureLeftPanelOpen` 추가. 보드에서 오버레이 선택·리사이즈 핸들에도 동일 적용. 빈 본문일 때 `OverlayTextField`에 `autoFocus`.
- 재발 방지: “디테일로 보내기”는 토글이 아니라 연 전용 액션으로 처리할 것.
- 검증: `npx tsc -b`, `npm run lint` 성공.
- 관련 파일: `src/store/board-store.ts`, `src/components/board/YearBoard.tsx`, `src/components/board/BoardOverlays.tsx`, `src/components/panels/detail/OverlayDetail.tsx`, `docs/MISTAKE_LOG.md`

## [2026-03-31] 포스트잇 — 백로그 DnD·컨텍스트 메뉴(롱프레스)

- 증상: 일정을 포스트잇에 묶는 경로가 디테일·Place 위주로만 보임.
- 원인: 보드상 직관적 제스처(DnD, 우클릭/롱프레스) 없음.
- 해결: `application/x-anniary-item-id`로 백로그 행 `draggable`, 포스트잇 `<g>`에 `dragOver`/`drop`으로 `linkedItemId` 설정. 우클릭·~520ms 롱프레스로 고정 메뉴(`createPortal`), 연결·해제·일정 목록. 포스트잇만 포인터 다운 시 드래그를 임계 이동 후 시작해 롱프레스와 충돌 완화. `boardItems` 구독은 `EMPTY_ITEMS` 고정 참조로 안정화.
- 재발 방지: SVG 하위에서 HTML 메뉴는 반드시 portal. 드롭은 Select 모드에서만 `preventDefault`.
- 검증: `npx tsc -b`, `npm run lint`, `npm run build` 성공.
- 관련 파일: `src/constants/dnd.ts`, `src/components/board/BoardOverlays.tsx`, `src/components/board/BoardOverlays.css`, `src/components/panels/BacklogPanel.tsx`, `src/components/panels/detail/OverlayDetail.tsx`, `docs/MISTAKE_LOG.md`

## [2026-03-31] 포스트잇 백로그 DnD — 드롭 미동작 수정

- 증상: 우클릭·롱프레스 메뉴는 되는데 백로그에서 포스트잇으로 드래그앤드롭이 붙지 않음. 선택되지 않은 포스트잇에도 드롭으로 연결되어야 함.
- 원인: SVG에서 `<g>`에만 `dragOver`/`drop`을 두면 위에 그린 `<text>`·접기 `<polygon>`·`path`/도형이 히트 테스트를 가져감. 또한 `effectAllowed`가 `copy`인데 `dropEffect`를 `link`로 두면 드롭이 거절될 수 있음. `dragenter`에서 `preventDefault` 누락 시 환경에 따라 드롭이 불안정함. `dataTransfer.types`의 MIME 대소문자 차이.
- 해결: 포스트잇 전면 투명 `rect` 드롭존을 모든 비주얼 요소 위·선택 테두리( pointer-events: none ) 아래에 두고 `dragenter`+`dragOver`+`drop` 처리. 본문·링크 텍스트와 접기 삼각형은 `pointer-events: none`. `dataTransferHasBacklogItem`으로 타입 검사 대/소문자 무시. `dropEffect`를 `copy`로 맞춤. 드롭 로직은 `isSel`과 무관(기존과 동일).
- 재발 방지: SVG 위 HTML5 DnD는 **실제 히트되는 맨 위 요소**에 `dragOver`/`drop`을 두거나, 투명 히트 레이어로 통일. `effectAllowed`와 `dropEffect`를 항상 짝지어 확인.
- 검증: `npm run build` 성공, 변경 파일 린트 이슈 없음.
- 관련 파일: `src/constants/dnd.ts`, `src/components/board/BoardOverlays.tsx`, `docs/MISTAKE_LOG.md`

## [2026-03-31] 백로그·메모 줄바꿈 및 마크다운 표시

- 증상: 메모 입력 시 줄바꿈이 보이지 않거나(보드 한 줄 렌더), 백로그 빠른 입력이 전체를 제목으로만 저장. 일정·메모 본문에 마크다운이 렌더되지 않음.
- 원인: 백로그 `handleAdd`가 `text.trim()`만 제목으로 쓰고 `body`를 넘기지 않음. 보드 포스트잇이 SVG 단일 `<text>`로만 그림. 본문 표시가 `<pre>` 원문 또는 문자열 슬라이스뿐이라 MD 미적용.
- 해결: 백로그는 첫 줄→`title`, 이후→`body` 분리 저장·createRange 라벨 보강. `marked`+`DOMPurify`로 `markdownToHtml`/`MarkdownView` 도입, 백로그 펼침·오버레이 디테일·일정 디테일(2줄 이상 시 본문) 미리보기. 보드는 `markdownToPlainText`+`<tspan>` 다줄. 텍스트 영역에 `white-space: pre-wrap`. 오버레이 편집 동기화는 `key=\`${id}:${storeText}\``로 리마운트(React 19 `set-state-in-effect` 린트 회피).
- 재발 방지: 여러 줄 UX는 **저장 스킴(title/body)** 과 **표시 위치(SVG vs HTML)** 를 함께 바꿀 것. 스토어 문자열이 바뀌면 로컬 draft는 `key` 또는 명시 동기화로 맞출 것.
- 검증: `npm run lint`, `npm run build` 성공.
- 관련 파일: `package.json`, `src/utils/markdown.ts`, `src/components/common/MarkdownView.tsx`, `src/components/common/markdown-view.css`, `src/components/panels/BacklogPanel.tsx`, `src/components/panels/BacklogPanel.css`, `src/components/panels/detail/OverlayDetail.tsx`, `src/components/panels/detail/ItemDetail.tsx`, `src/components/panels/DetailPanel.css`, `src/components/board/BoardOverlays.tsx`, `docs/MISTAKE_LOG.md`

## [2026-03-31] 포스트잇·백로그 연결 시 본문·마크다운 전체 표시

- 증상: 백로그 일정을 포스트잇에 연결해도 `→` 에 잘린 제목만 보이고 본문·마크다운이 거의 반영되지 않음.
- 원인: 연결 정보를 SVG `<text>` 한 줄로만 표시. 포스트잇 본문은 오버레이 `text`와 분리된 일정 `body`를 그리지 않음.
- 해결: 포스트잇에 `foreignObject` + `MarkdownView`로 (1) 포스트잇 자체 메모 (2) 구분선 (3) 연결 일정 제목·본문 전체를 렌더. 투명 드롭존은 DOM 상 위에 유지해 DnD 유지. `xmlns`는 TS와 맞추기 위해 spread 캐스트.
- 재발 방지: **연결 엔티티의 필드(`ItemEntity.body` 등)** 를 UI에 노출할 때는 저장소 전체 문자열·마크다운 파이프라인을 같은 컴포넌트로 묶을 것. SVG만 쓰면 HTML 마크다운은 `foreignObject` 등 추가 레이어 필요.
- 검증: `npm run lint`, `npm run build` 성공.
- 관련 파일: `src/components/board/BoardOverlays.tsx`, `src/components/board/BoardOverlays.css`, `src/components/panels/detail/OverlayDetail.tsx`, `docs/MISTAKE_LOG.md`

## [2026-03-31] 백로그 Shift+Enter 연속 줄바꿈·줄바꿈 버튼 설정

- 증상: Shift+Enter로 줄바꿈을 여러 번 넣을 때 한 번만 들어가거나, 터치에서 줄바꿈이 불편함.
- 원인(추정): 일부 환경에서 `shiftKey`가 누락되어 두 번째 Enter가 “추가”로 처리됨. Shift+Enter만으로는 터치 UX 한계.
- 해결: `Enter` 처리 시 `getModifierState('Shift')`로 보강. 설정 `backlogShowNewlineButton` + 입력란 옆 ↵ 버튼으로 커서 위치에 `\n` 삽입(`onMouseDown` preventDefault로 포커스 유지). persist v7 마이그레이션에 기본값 반영.
- 재발 방지: 수정자 키 의존 단축키는 **nativeEvent.getModifierState**까지 확인. 입력·제출 이중 동작은 **설정 가능한 보조 UI**로 보완.
- 검증: `npm run build`, `npm run lint` 성공.
- 관련 파일: `src/types/state.ts`, `src/store/board-store.ts`, `src/components/panels/BacklogPanel.tsx`, `src/components/panels/BacklogPanel.css`, `src/components/panels/SettingsPanel.tsx`, `docs/MISTAKE_LOG.md`

## [2026-03-31] 마크다운 연속 줄바꿈·showNewlineInsertButton 통일

- 증상: 줄바꿈을 여러 번 넣어도 마크다운 렌더가 한 단계만 반영되는 듯함. 설정에 한글 혼입. 오버레이 메모에 ↵ 없음.
- 원인: GFM이 연속 `\n`을 문단 하나로 접음. 설정 명이 backlog 전용처럼 보임.
- 해결: `expandExtraBlankLines`로 3+연속 `\n`에 `<br>` 삽입 후 파싱. `MarkdownView`는 빈 문자열만 스킵. `showNewlineInsertButton`·persist v8·구 키 이관. Settings/ItemDetail placeholder 영어 정리. `textareaNewline`·`newline-insert-btn` 공유, Overlay·Item·Backlog 적용.
- 검증: `npm run build`, `npm run lint` 성공.
- 관련 파일: `src/utils/markdown.ts`, `src/utils/textareaNewline.ts`, `src/components/common/MarkdownView.tsx`, `src/theme/global.css`, `src/types/state.ts`, `src/store/board-store.ts`, `src/components/panels/SettingsPanel.tsx`, `src/components/panels/BacklogPanel.tsx`, `src/components/panels/detail/OverlayDetail.tsx`, `src/components/panels/detail/ItemDetail.tsx`, `docs/MISTAKE_LOG.md`

## [2026-03-31] UI 문자열 영어 통일(i18n 준비)

- 증상: 오버레이 디테일·Place 설정·백로그 입력·툴바·포스트잇 컨텍스트 메뉴에 한글 라벨·안내가 섞여 있음.
- 원인: 기능 추가 시 한글 카피로 먼저 추가됨; 일부 블록만 이전에 영어로 정리되어 불일치.
- 해결: 사용자에게 보이는 문자열만 영어로 통일(Linked item, Width/Height, Body (markdown), Place default memo, backlog placeholder, BoardOverlays 링크 메뉴, TopToolbar flyout/Place 종류 등). 제목 없음 fallback은 `(no title)`, 정렬은 `localeCompare(..., 'en')`.
- 재발 방지: 새 UI 문구는 기본 영어로 두고, 다국어는 이후 `t('key')` 등으로 치환할 것. 주석·코드 내부 문서는 팀 규칙과 별도.
- 검증: `npm run lint`, `npm run build` 성공.
- 관련 파일: `src/components/panels/detail/OverlayDetail.tsx`, `src/components/panels/SettingsPanel.tsx`, `src/components/panels/BacklogPanel.tsx`, `src/components/board/BoardOverlays.tsx`, `src/components/toolbar/TopToolbar.tsx`, `docs/MISTAKE_LOG.md`

## [2026-03-31] 디테일·설정 장문 힌트 → HelpTip

- 증상: 오버레이 링크 안내·Place/줄바꿈 설정에 장문이 패널에 그대로 노출되어 스캔하기 어려움.
- 원인: 동작 설명을 한 블록으로 붙여 넣음; 일정 디테일의 `HelpTip` 패턴과 불일치.
- 해결: `OverlayDetail` Linked item 라벨 옆 `HelpTip`(짧은 툴팁 카피). `SettingsPanel`은 Newline 토글 라벨·Place 섹션 제목 옆 `HelpTip`, 해당 `settings-hint-block` 제거. `settings-section-heading`·`settings-label--with-help` 스타일 추가.
- 재발 방지: 긴 UX 설명은 **패널 본문이 아니라 HelpTip(또는 이후 i18n 키)** 로만 두고, 라벨 옆 한 줄 요약만 유지.
- 검증: `npm run lint`, `npm run build` 성공.
- 관련 파일: `src/components/panels/detail/OverlayDetail.tsx`, `src/components/panels/SettingsPanel.tsx`, `src/components/panels/SettingsPanel.css`, `docs/MISTAKE_LOG.md`

## [2026-03-31] HelpTip 뷰포트·패널 클리핑

- 증상: 설정 우측 패널 등 `overflow` 안에서 HelpTip을 띄우면 툴팁이 잘리거나 화면 밖으로 나감.
- 원인: 툴팁을 앵커 기준 `position: absolute`로만 두어 스크롤 컨테이너에 클립됨; 가로는 중앙 정렬만 해 뷰포트 경계를 보지 않음.
- 해결: `createPortal(..., document.body)` + `position: fixed` + `getBoundingClientRect`로 좌표 계산 후 가로·세로를 뷰포트에 클램프, 아래 공간 부족 시 위쪽 배치. `scroll`/`resize` 시 재배치. React 19 린트 회피를 위해 닫을 때 `setPos(null)`은 effect가 아니라 `close` 핸들러에서 처리.
- 재발 방지: 패널·드롭다운 밖으로 나가야 하는 오버레이는 **portal + fixed + 클램프**를 기본으로 검토.
- 검증: `npm run lint`, `npm run build` 성공.
- 관련 파일: `src/components/panels/detail/HelpTip.tsx`, `src/components/panels/DetailPanel.css`, `docs/MISTAKE_LOG.md`

## [2026-03-31] 날짜 선택만으로는 디테일 비표시 — 타임라인은 더블클릭

- 증상: 날짜만 눌러도 왼쪽 디테일에 하루 UI가 떠 백로그 등과 중복됨.
- 원인: `DetailPanel`이 `selection.type === 'day'`일 때 `DayDetail`을 렌더.
- 해결: `DayDetail.tsx` 제거. `day`·`days` 선택 시 디테일 패널에는 안내문만. 타임라인은 보드 `ExpandedCell`(셀 더블클릭)만. `ExpandedCell`에 `onSelectItem`으로 행·막대 클릭 → `setSelection({ type: 'item', itemId })` + `ensureLeftPanelOpen('detail')` (`YearBoard`에서 연결, `stopPropagation`로 보드 제스처와 분리).
- 재발 방지: 날짜 하이라이트와 **디테일 패널 콘텐츠** 진입을 혼동하지 말 것.
- 검증: `npm run lint`, `npm run build` 성공.
- 관련 파일: `src/components/panels/DetailPanel.tsx`, `src/components/board/ExpandedCell.tsx`, `src/components/board/YearBoard.tsx`, `docs/MISTAKE_LOG.md`

## [2026-03-31] Excalidraw류 텍스트박스 — 리사이즈에 글자 크기 연동

- 증상: 상자만 키우고 글자 크기는 그대로여 [Excalidraw](https://excalidraw.com/)와 다름.
- 원인: `textBoxFontSizePx`를 뷰에 그대로 쓰고 프레임 면적 변화를 반영하지 않음.
- 해결: `textBoxScale.ts`로 `√(새면적/이전면적)` 배율; 리사이즈 포인터 업 시 `textBoxFontSizePx` 갱신. 렌더는 `scaledTextBoxFontPx(저장값, o.width, o.height, rw, rh)`로 드래그 중에도 동일 규칙. 툴 아이콘 `IconExText`(굵은 T).
- 재발 방지: 화이트보드 텍스트는 박스 스케일과 폰트 스케일을 한 식으로 유지; 디테일 패널의 px는 «현재 박스 크기 기준」임을 라벨로 명시.
- 검증: `npm run build` 성공.
- 관련 파일: `src/utils/textBoxScale.ts`, `src/components/board/BoardOverlays.tsx`, `src/components/board/YearBoard.tsx`, `src/components/icons/Icons.tsx`, `src/components/toolbar/TopToolbar.tsx`, `src/components/panels/detail/OverlayDetail.tsx`, `src/types/entities.ts`, `src/store/board-store.ts`, `docs/MISTAKE_LOG.md`

## [2026-03-31] 텍스트박스 root 패딩 → 우·하단이 div 타깃이라 드래그 move 끊김

- 증상: 특히 아래·오른쪽 모서리에서 끌어도 이동이 안 되는 것처럼 보임(빌드 문제가 아니라 레이아웃·이벤트 타깃 이슈).
- 원인: `.board-wb-textbox-root`에 `padding`이 있어 그 띠에서 `pointerdown` 타깃이 `textarea`가 아닌 부모 **div**. `closest('textarea')`가 실패하고 `setPointerCapture(div)` 뒤 SVG `g`의 `onPointerMove`와 연결이 끊김(foreignObject 경계).
- 해결(1차): 패딩을 ta로 옮김 → 일부 환경에서 `height:100%`/FO로 **우·하단 레이아웃 퇴보** 유발.
- 해결(최종): **CSS는 원래대로**(패딩은 root). `pointerdown`은 `closest('.board-wb-textbox-root')`로 패딩 띠 포함. `pointermove`/`up`/`cancel`은 **textarea가 아니라 root**에서 처리해 버블+캡처 모두 커버.
- 재발 방지: 래퍼 패딩은 div 타깃이 됨 — **레이아웃을 억지로 바꾸기보다** 래퍼에 포인터 브리지·히트 조건을 맞출 것.
- 검증: `npm run lint`, `npm run build` 성공.
- 관련 파일: `src/components/board/BoardOverlays.tsx`, `src/components/board/BoardOverlays.css`, `docs/MISTAKE_LOG.md`

## [2026-03-31] 선택 SE 핸들이 프레임 안과 겹쳐 모서리 이동 불가로 보임

- 증상: 아래 모서리를 잡아도 끌고 이동이 안 되는 것 같음.
- 원인: 리사이즈 핸들 rect가 `rw-2.8`·`rh-2.8` 기준으로 **프레임 내부에 큰 영역**을 덮어, 그 구간의 pointerdown이 항상 리사이즈로만 처리됨.
- 해결: `RESIZE_HANDLE_GAP`·`RESIZE_HANDLE_SIZE`로 핸들을 **`(rw, rh)` 바깥** 우하단에 배치; 시각적 모서리는 본문/캐처·textarea 이동으로 사용.
- 재발 방지: **이동 vs 리사이즈** 히트가 겹치지 않게—핸들은 바운딩 박스 **밖** 또는 명확한 별 영역으로 둘 것(레이블·모드 분리 포함).
- 검증: `npm run lint`, `npm run build` 성공.
- 관련 파일: `src/components/board/BoardOverlays.tsx`, `docs/MISTAKE_LOG.md`

## [2026-03-31] 텍스트박스 우·아래(본문보다 큰 프레임)에서 드래그 불가

- 증상: 오른쪽/아래 모서리 쪽을 잡고 끌 때 이동이 안 되는 것처럼 보임.
- 원인: `hitCap`(콘텐츠 높이+ 패딩)보다 `ly`가 크면 `pointerdown`에서 바로 return해 pending/본문 드래그가 시작되지 않음. 프레임이 텍스트보다 크면 하단·우측 하단이 전부 해당. (우하단 아주 작은 영역은 리사이즈 핸들이라 리사이즈만 됨.)
- 해결: 텍스트박스 분기에서 `hitCap` 조기 return 제거. 프레임 전체에서 선택·이동과 textarea pending이 동작하도록 통일. `textBoxInteractiveHeight` import 제거.
- 재발 방지: “빈 영역 포인터 통과”를 의도할 때는 **`pointer-events: none` 등**으로 실제로 통과시키고, **히트 판정만** 두면 잘림·무동작이 난다.
- 검증: `npm run lint`, `npm run build` 성공.
- 관련 파일: `src/components/board/BoardOverlays.tsx`, `docs/MISTAKE_LOG.md`

## [2026-03-31] 텍스트박스 본문에서 드래그 이동(pending + foreignObject 포인터)

- 증상: 선택된 텍스트박스에서 본문(textarea)을 잡고 끌면 거의 이동하지 않음(상단 얇은 레일만 잡기 어려움).
- 원인: (1) textarea `pointerdown`에서 조기 return으로 오버레이 드래그가 시작되지 않음. (2) `setPointerCapture(textarea)` 이후 `pointermove`가 SVG `<g>`까지 안정적으로 전달되지 않는 경우가 있음(foreignObject·HTML 경계).
- 해결: 포스트잇과 동일하게 `pendingWbTextDragRef` + 이동 임계 초과 시 `blur` 후 본문 드래그로 승격. `textarea`에 `onPointerMove` / `onPointerUp` / `onPointerCancel`을 연결해 `stopPropagation`과 함께 `onOverlayPointerMove`·`onOverlayPointerUp`을 직접 호출.
- 재발 방지: **SVG 안 `foreignObject` 하위 HTML**에서 캡처한 포인터는 **부모 `<g>`만 믿지 말고**, 동일 제스처는 타깃 요소에도 핸들러를 붙여 검증할 것.
- 검증: `npm run lint`, `npm run build` 성공.
- 관련 파일: `src/components/board/BoardOverlays.tsx`, `docs/MISTAKE_LOG.md`

## [2026-03-31] 텍스트박스 셀렉트 — 좌표계 오류 + 포인터 미수신

- 증상: 셀렉트 모드에서 텍스트박스를 눌러도 선택이 안 됨.
- 원인: (1) `svg.getScreenCTM()`으로 변환한 뒤 오버레이 위치 `ox, oy`를 빼 로컬 좌표가 어긋남. (2) 배경·FO가 모두 `pointer-events: none`이면 SVG `<g>`만으로는 포인터 타겟이 되지 않아 이벤트가 도달하지 않음.
- 해결: `pointerInOverlayLocal`에서 `e.currentTarget`(오버레이 g)의 `getScreenCTM().inverse()`만 사용. 셀렉트 시 전면 `pointer-events: all` 투명 `rect`(catcher) 추가. 편집 시 `foreignObject`는 `pointer-events: all`.
- 재발 방지: 오버레이 내부 히트는 **그룹 로컬 CTM**으로만 변환하고, 잡을 영역이 없으면 **명시적 투명 rect**로 받기.
- 검증: `npm run build` 성공.
- 관련 파일: `src/components/board/BoardOverlays.tsx`, `docs/MISTAKE_LOG.md`

## [2026-04-05 14:38 KST] 텍스트박스 하단 모서리 드래그 — 히트 갭·좌표 경계

- 증상: 아래 모서리에서 끌어 이동이 여전히 안 됨. 로그 날짜가 실제와 어긋남(에이전트가 대화 힌트 날짜만 사용).
- 원인: (1) `foreignObject` 높이가 이론상 `rh`에 맞아도 **부동소수/렌더**로 하단 한 줄이 **캐처 rect**만 맞고, `closest('.board-wb-textbox-root')`·루트 포인터 브리지가 안 탐. (2) `ly > rh`처럼 **경계 바깥으로 분류**되는 CTM 오차. (3) 회고 로그 타임스탬프를 시스템 시각이 아닌 고정 힌트로 기재.
- 해결: 선택 시 `foH`에 `WB_FO_HEIGHT_EXTRA`. `pointerdown`에 `OVERLAY_HIT_EDGE_TOL`. 선택된 상태에서 **`board-wb-textbox-catcher`** 위에서도 pending·캡처 허용. `docs/MISTAKE_LOG.md`에 **실제 `date` 사용** 안내 추가, 본 항목은 `2026-04-05 14:38 KST` 기준.
- 재발 방지: FO vs 캐처 **동일 박스 경계**에 두지 말고 살짝 겹치거나 허용 오차를 둘 것. 회고는 **항상 로컬 `date`**로 찍을 것.
- 검증: `npm run lint`, `npm run build` 성공.
- 관련 파일: `src/components/board/BoardOverlays.tsx`, `docs/MISTAKE_LOG.md`

## [2026-04-05 14:42 KST] 텍스트박스(특히 하단)·textarea 드래그 — 브라우저 기본 제스처가 move 끊음

- 증상: 아래 모서리·본문에서 끌어 이동이 계속 안 됨. 히트/FO 보정만 반복해도 재현.
- 원인(확인): **`textarea`에서 포인터를 잡고 움직일 때** 브라우저가 **텍스트 선택·스크롤** 등 **기본 동작**으로 포인터를 소비해, `pointermove`가 **React/SVG `g` 버블**이나 루트 `div` 브리지까지 **안정적으로 도달하지 않는** 경우가 있음. foreignObject만의 문제가 아님. (참고: foreignObject/React 포인터 관련 StackOverflow, WebKit foreignObject 클릭 이슈.)
- 해결: 텍스트박스 **DOM/캐처에서 pending 시작 시** `window`에 `pointermove`/`pointerup`/`pointercancel`을 붙여 **리사이즈와 같은 패턴**으로 이동·업 처리. `onOverlayPointerUp` **후** `finally`에서 리스너 제거. 텍스트박스에 대해 **`g`의 move/up/cancel**은 윈도우 브리지가 살아 있는 동안 **스킵**해 이중 커밋 방지. `releasePointerCapture`는 `pointerdown` 타깃 ref로 통일.
- 재발 방지: **textarea/contenteditable**에서 캔버스·오버레이 드래그를 섞을 때 **`window` 포인터 파이프** 또는 명시적 `preventDefault` 전략을 설계에 포함할 것.
- 검증: `npm run lint`, `npm run build` 성공.
- 관련 파일: `src/components/board/BoardOverlays.tsx`, `docs/MISTAKE_LOG.md`

## [2026-04-05 14:50 KST] 텍스트박스 하단만 드래그 실패 — 상단 SVG 레일 vs 하단 textarea만

- 증상(Arc 등): 위·왼·오른은 되는데 **아래 모서리만** 이동이 안 됨.
- 원인: **상단**은 투명 SVG `rect`로만 잡혀 textarea 기본 동작과 분리됨. **하단**은 그 레일이 없어 **textarea/FO** 한 줄에만 의존 → 선택·스크롤과 겹쳐 한 변만 깨지는 비대칭.
- 해결: 선택·언락 시 **하단 SVG 드래그 레일** 추가(상단과 동일 두께, 박스 매우 낮을 때 비례 축소), `foreignObject` 높이를 `rh - 상하 레일`로 맞춤.
- 재발 방지: 잡기(grab) 축은 **SVG와 HTML 입력층을 같은 변에서 섞지 말 것**.
- 검증: `npm run lint`, `npm run build` 성공.
- 관련 파일: `src/components/board/BoardOverlays.tsx`, `docs/MISTAKE_LOG.md`

## [2026-04-05 17:30 KST] DayCell Z0 — 요일 같은 줄(인라인 tspan·중앙 정렬)

- 증상: Z0에서 요일·일 숫자를 같은 `y`만 맞추거나 양끝(x=2 vs x=w-2)에 두면 광학적으로 한 줄이 아니거나, 좁은 셀에서 오른쪽 글자가 벽에 붙어 보임.
- 원인: 서로 다른 `fontSize`의 `<text>` 두 개는 동일 베이스라인만으로는 정돈이 안 되고, 요일만 상단·우측 고정이면 숫자가 중앙에 있어 수직이 갈라짐.
- 해결: **Z0 + showDow**일 때만 단일 `<text>`에 `<tspan>` 두 개(숫자 6.5 → 요일 3.25, `dx=2`)로 왼쪽부터 이어 붙이고 `y={h/2}` + `dominantBaseline="middle"`. Z1 이상은 기존 요일 우상단 + 숫자 분리 유지.
- 재발 방지: 초미세 셀에서 이중 라벨은 **한 `text` 안 tspans**로 묶거나 캡-하이 기준을 맞출 것. 줄바꿈 없이 가로가 모자라면 폰트·dx를 함께 줄일 것.
- 검증: `npx tsc --noEmit`, `npm run lint` 성공.
- 관련 파일: `src/components/board/DayCell.tsx`

## [2026-04-05 17:31 KST] DayCell Z0 — 인라인·단독 숫자 모두 상단(y=9)으로

- 증상: Z0 인라인 라벨을 `y=h/2`+`middle`로 두어 셀 위쪽이 비고 글자가 아래로 붙어 보임. 연간 축소 뷰에서 숫자가 칸 위에 붙지 않음.
- 원인: 세로 중앙 정렬이 tiny 셀에서 연간 보드 UX(Z1과 같은 상단 밴드)와 어긋남.
- 해결: Z0 인라인 `<text>`를 `y=9`(기본 알파베틱 베이스라인, Z1 일 숫자와 동일). Z0·단독 숫자 분기도 `h/2+1` 제거 후 `y=9` 통일.
- 재발 방지: Z0 텍스트 세로 위치를 바꿀 때 **Z1 일 숫자 `y=9`·상태 점 `cy=10`** 과 한 덩어리로 맞출 것.
- 검증: `npx tsc --noEmit`, `npm run lint` 성공.
- 관련 파일: `src/components/board/DayCell.tsx`

## [2026-04-05 17:33 KST] DayCell Z0 — Z1과 동일 분기(좌 숫자·우 요일)로 통일

- 증상: Z0만 `tspan` 인라인으로 그려 Z1(요일 `y=5` 우측, 숫자 `y=9` 좌측)과 레이아웃이 달라 보임.
- 원인: "한 줄" 요구에 과도하게 특수 케이스를 둔 결과, 참조 줌(Z1)과 기하 구조가 불일치.
- 해결: Z0 **전용 인라인 분기 제거**. `showDow`면 모든 줌에서 동일하게 요일 `x=w-2,y=5`, 숫자 `x=2,y=9`만 **Z0일 때 `fontSize` 7**, 그 외 8.
- 재발 방지: 줌은 **글자 크기·정책**만 `DAY_CELL_POLICY` 등으로 구분하고, **라벨 상대 좌표는 한 경로로** 유지할 것.
- 검증: `npx tsc --noEmit`, `npm run lint` 성공.
- 관련 파일: `src/components/board/DayCell.tsx`
