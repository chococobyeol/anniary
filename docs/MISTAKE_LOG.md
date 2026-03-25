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
