# Anniary 구현 체크리스트

## 기술 스택 (확정)

| 구분 | 선택 | 버전 |
|------|------|------|
| Framework | React + TypeScript | React 19, TS 5.9 |
| Build | Vite | 6.x |
| 보드 렌더링 | SVG + CSS transforms | - |
| 상태 관리 | Zustand | 5.x |
| ID 생성 | nanoid | 5.x |
| 로컬 DB | Dexie (IndexedDB) | 4.x |
| 스타일링 | CSS Variables + CSS files | - |
| 모바일 패키징 | Capacitor (미래) | - |

---

## 완료된 항목

### 프로젝트 기반
- [x] Vite + React + TypeScript 프로젝트 셋업
- [x] 폴더 구조 설계 (`types`, `store`, `commands`, `components`, `hooks`, `utils`, `theme`)
- [x] 핵심 의존성 설치 (zustand, nanoid, dexie)

### 타입 시스템
- [x] 엔티티 타입 정의 (BoardEntity, ItemEntity, RangeEntity, OverlayEntity, AssetEntity)
- [x] 상태 타입 정의 (AppState, ViewState, PanelState, SelectionTarget)
- [x] 커맨드 타입 정의 (Board/Item/Range/Overlay CRUD commands)
- [x] 뷰모델 타입 정의 (DayCellViewModel, DayCellRenderPolicy)
- [x] 줌 레벨별 셀 표시 정책 매핑 (Z0~Z4)

### 상태 관리
- [x] Zustand store (useBoardStore)
- [x] Board CRUD (createBoard, setActiveBoard)
- [x] Item CRUD (createItem, updateItem, deleteItem)
- [x] Range CRUD (createRange, updateRange, deleteRange)
- [x] Overlay CRUD (createOverlay, updateOverlay, deleteOverlay)
- [x] View state (scale, translate, zoomLevel)
- [x] Panel state (left/right open/close, mode)
- [x] Interaction mode (pan/select/draw/place)
- [x] Selection state

### 테마 시스템
- [x] CSS custom properties 기반 테마 변수 정의
- [x] 색상, 타이포그래피, 간격, 상태 색상 전체 정의
- [x] 글로벌 스타일 리셋

### SVG 보드
- [x] YearBoard 컴포넌트 (12개월 세로 배치)
- [x] MonthRow 컴포넌트 (월별 가로 날짜 배열)
- [x] 기간 막대: `timelineBarHidden` / `timelinePriority` (`docs/TIMELINE_BARS.md`)
- [x] DayCell 컴포넌트 (개별 날짜 셀)
- [x] 날짜 레이아웃: 각 월이 한 줄, 1~31일 가로 연속 배열
- [x] 줌 레벨별 셀 정보 밀도 변화 (Z0~Z4)
- [x] Range marker 표시 (left band 방식, 최대 3개)
- [x] 상태 dot 표시
- [x] Progress bar 표시
- [x] Summary 텍스트 표시
- [x] Hidden count 표시
- [x] Today 하이라이트
- [x] 선택 상태 outline

### 줌/팬 시스템
- [x] 커스텀 useZoomPan 훅 (외부 라이브러리 없음)
- [x] 마우스 휠 줌 (Ctrl/Cmd + wheel → 커서 기준 줌)
- [x] 트랙패드 스크롤 (wheel → 팬)
- [x] 포인터 드래그 팬 (pan 모드)
- [x] 핀치 줌 (터치 2점)
- [x] 줌 범위 제한 (0.3x ~ 8x)
- [x] 줌 레벨 자동 판정 (셀 화면 폭 기준)

### 상단 툴바
- [x] 반투명 오버레이 툴바
- [x] Interaction mode 토글 (Pan/Select/Draw/Place)
- [x] 연도 표시
- [x] 줌 레벨 + 퍼센트 표시
- [x] 설정 버튼 → 우측 패널 토글

### 좌측 아이콘바 + 패널
- [x] 아이콘바 (Backlog, Search, Filter, Ranges, Overlays, Detail)
- [x] 좌측 패널 overlay 방식 (보드 크기 변경 없음)
- [x] Backlog 패널 (item 생성, 상태 토글, 삭제)
- [x] Detail 패널 (선택된 날짜 상세 표시)
- [x] 모드별 패널 전환

### 우측 패널
- [x] 시스템 패널 기본 구조 (settings, account, sync, export 등)
- [x] overlay 방식, 닫기 버튼

### 기본 기능
- [x] ESC로 전체 패널 닫기
- [x] 앱 시작 시 자동 보드 생성 (현재 연도)

### v1.1 패치 (2026-03-17)
- [x] 뷰 초기화(Fit to screen) 버튼 추가 — 상단 툴바에 모드 그룹 옆 배치
- [x] 첫 진입 시 전체 달력이 화면에 맞도록 자동 fit (resetView)
- [x] 요일 표시 헤더 (DayOfWeekHeader) — 보드 상단에 S/M/T/W/T/F/S, 일요일 빨강, 토요일 파랑
- [x] 모든 아이콘을 이모지 → SVG 벡터 아이콘으로 교체 (Icons.tsx, 17개 아이콘)
- [x] 한글(macOS) 이중 입력 버그 수정 — `isComposing` 체크 적용
- [x] 메모 입력 개선 — 크기 조절 가능한 textarea, 마크다운 힌트, Enter/Shift+Enter 구분
- [x] Backlog item에 body(메모) 필드 지원

### v1.2 패치 (2026-03-17)
- [x] **wheel passive listener 수정** — React `onWheel`(passive) → `useEffect` + `addEventListener({ passive: false })`로 변경. 스크롤/줌 시 렉 제거.
- [x] **팬 아이콘 수정** — 복잡한 Hand SVG → 단순 Move(십자 화살표) 아이콘으로 교체. `IconMove` 추가.
- [x] **요일 표시 완전 재설계** — 공유 헤더(1월 기준) 방식 폐기 → 각 셀에 실제 요일 표시. `DayCellViewModel`에 `dayOfWeek`, `dayOfWeekLabel`, `isWeekend` 추가. `DayOfWeekHeader.tsx` 삭제.
- [x] **주말 시각 구분** — 주말 셀 배경색(`--bg-cell-weekend`), 일요일/토요일 날짜 숫자 색상 구분
- [x] **백로그 done 아이템 관리** — done 상태 아이템이 즉시 사라지지 않고 "완료됨" 접이식 섹션에 표시
- [x] **백로그 긴 내용 확장** — 아이템 클릭 시 전체 body 내용 펼침/접기 (expand/collapse)
- [x] **아이콘 추가** — `IconChevronDown`, `IconChevronUp`, `IconCheck` 추가 (총 20개)

### v1.3 패치 (2026-03-17)
- [x] **setState-during-render 버그 수정** — `useBoardStore.setState()` 렌더 중 호출 → module-level `fitToScreenRef` 방식으로 변경. 무한 재렌더링 루프 및 렉 완전 제거.
- [x] **줌 기능 정상화** — 위 버그가 원인. 재렌더링 폭풍이 wheel 핸들러를 무력화했음. setState 제거 후 Ctrl/Cmd+wheel 줌 정상 동작.
- [x] **상태 토글 1클릭** — 기존 3단계(none→in-progress→done) 순환에서 1클릭 토글(none↔done)로 변경.

### v1.4 패치 (2026-03-17)
- [x] **wheel 리스너 미등록 수정** — early return으로 containerRef가 null인 상태에서 useEffect 실행 → 리스너 미등록. container div를 항상 렌더하도록 수정.

### v1.5 기능 추가 (2026-03-17)
- [x] **요일 표시 2가지 모드** — `linear`(셀 내 요일 표시) + `weekday-aligned`(상단 헤더 + 요일별 열 정렬). 설정에서 전환 가능.
- [x] **요일 3글자** — S/M/T/W/T/F/S → SUN/MON/TUE/WED/THU/FRI/SAT
- [x] **줌 방향 설정** — 기본값: 휠 아래=확대. `zoomInverted` 설정으로 반전 가능.
- [x] **설정 패널 구현** — 우측 패널 settings 모드에 레이아웃/줌 설정 UI 추가. 토글 스위치, 셀렉트 박스.
- [x] **AppSettings 타입** — `dayLayout: 'linear' | 'weekday-aligned'`, `zoomInverted: boolean` 추가.
- [x] **WeekdayHeader 컴포넌트** — weekday-aligned 모드용 상단 요일 헤더. 열 수는 해당 연도 기준 동적 계산.
- [x] **레이아웃 전환 시 자동 fitToScreen** — dayLayout 변경 시 보드를 화면에 맞춤.

### v2.0 — 편집 흐름 구축 (2026-03-17)
- [x] **날짜 인덱싱 최적화** — `Object.values().filter()` 제거. `buildItemDateIndex(items, boardYear)` / `buildRangeDateIndex`로 사전 인덱싱 후 O(1) 조회. 반복 일정은 `src/utils/repeat.ts`에서 연도 내 발생일 확장. `src/utils/indexing.ts`.
- [x] **셀 클릭 → 백로그 패널 자동 포커스** — pan 모드에서 단일 날짜 클릭 시 해당 날짜 선택 + 좌측 패널을 **backlog** 모드로 연다 (`YearBoard`). (detail은 아이콘 선택 또는 백로그에서 항목 클릭 등으로 연다.)
- [x] ~~**더블클릭 quick add**~~ → **더블클릭 셀 확장**으로 변경 (v2.1). 빈 task 자동 생성 제거, 더블클릭 시 해당 셀이 확장되어 항목 목록 표시.
- [x] **DetailPanel 편집기 승격** — 읽기 전용 → 실제 편집기로 변환:
  - 날짜별 item 추가 (kind 선택 + 제목 입력)
  - item 인라인 편집 (제목/메모 수정)
  - 상태 토글 (none ↔ done)
  - 백로그로 이동 (날짜 해제)
  - 삭제
- [x] **Interaction mode 규칙 (현재)**:
  - `pan`: 드래그=이동, 클릭=단일 날짜 선택 + 백로그 자동 포커스
  - `select`: Cmd/Ctrl+클릭=토글, 포인터 드래그=앵커~끝 날짜 사이 `days` 선택 + 백로그 자동 포커스
  - `draw`: 그림/필기용 예정 (예전 draw 드래그 range 생성은 **제거됨**)
  - `place`: 클릭=overlay·스티커 배치 예정

### v2.1 — 셀 UX 개선 (2026-03-17)
- [x] **셀 높이 증가** — `BASE_CELL_HEIGHT` 22→28. 세로 여유 확보, 내부 요소 y좌표 재배치.
- [x] **더블클릭 빈 task 생성 제거** — 불필요한 빈 task 자동 생성 동작 삭제.
- [x] **더블클릭 셀 확장** — 더블클릭 시 해당 셀 위치에 확장 카드(ExpandedCell) 오버레이 표시. 날짜/요일/아이템 목록 표시. 같은 셀 재더블클릭, ✕ 버튼, Escape, 다른 셀 클릭으로 닫힘.
- [x] **ExpandedCell 컴포넌트 신규** — `src/components/board/ExpandedCell.tsx`. SVG 오버레이 방식, 폭 4배 확장, 높이는 아이템 수에 따라 자동 조절.

### v3.0 — Range 편집 + select 경로로 기간 생성 (2026-03-17, 문서 정리 2026-03-25)
- [x] **date 유틸 확장** — `getDateKeysBetween`, `normalizeDateRange`, `compareDateKeys` 추가. range 날짜 열거 및 정규화 지원.
- [x] **screenToDateKey 유틸** — 화면 좌표 → SVG 보드 좌표 → dateKey 변환. linear/weekday-aligned 모드 모두 지원.
- [x] ~~**draw 모드 드래그 range 생성**~~ → **제거됨** (히스토리 항목). 기간 생성은 아래 select+백로그·디테일 경로로 통일.
- [x] **RangePreview 컴포넌트** — `src/components/board/RangePreview.tsx`에 구현되어 있으나 **현재 `YearBoard` 등에 미연결**(draw 제거 이후 미사용). 향후 select 드래그 프리뷰 등에 재사용 가능.
- [x] **range 생성 후 편집** — `createRange` 호출 후 `selection.type === 'range'`로 두면 좌측 Detail(`RangeDetail`)에서 편집 가능.
- [x] **DetailPanel range 편집** — 기간 표시, 이름/메모 인라인 편집, 종류(period/note/highlight) 선택, 상태(none/active/done/delayed) 선택, 색상 팔레트(8색) 선택, 삭제.
- [x] **draw 모드 커서** — draw 모드 시 crosshair 커서 적용.
- [x] **draw 모드 더블클릭 무시** — draw 모드에서 더블클릭 시 셀 확장 방지.
- [x] **select 드래그 → `days` 선택 + 백로그 포커스** — 연속 날짜 구간에서 백로그 추가 시 `createRange` + item → 기간 막대. 이후 **range 선택 시 `RangeDetail`에서 전부 편집**. (`days`만 고른 상태용 Detail 전용 폼은 두지 않음.)

### v3.1 — 일정 날짜/시간/기간 설정 (PRD 반영)
- [x] **ItemEntity 시간 필드** — `startTime`, `endTime` (HH:mm 형식) 추가. store createItem/updateItem 지원.
- [x] **~~BacklogPanel~~ 날짜/시간/기간 입력** — v3.1 시점 백로그 폼에 두었으나 **v3.2에서 백로그 입력은 textarea+태그만 유지**. 날짜·시간·기간 확장은 **Detail·보드 날짜 선택 + 백로그 추가** 및 **DayDetail / ItemDetail**에서 처리.
- [x] **DetailPanel 항목 추가 시 시간/기간** — "+ 시간/기간 설정" 펼침 → 시작/종료 시간, 종료일(기간 일정 시). 종료일 있으면 range 생성 후 item에 date+rangeId+시간 설정, 생성 후 selection을 range로 전환.
- [x] **DetailPanel item 편집 시 시간** — 인라인 편집 폼에 시작/종료 시간 입력. 목록에 시간 표시 (예: 09:00 ~ 18:00).
- [x] **DetailPanel range 편집 — 소속 항목** — 해당 range에 연결된 item 목록 표시, 연결 해제 버튼. Range 삭제 시 소속 item의 rangeId 해제 후 range 삭제.

### v3.2 — 백로그 UX (mwohaji 스타일 + 태그)
- [x] **ItemEntity tags** — `tags?: string[]` 추가. 미지정 시 기본 `['일반']`.
- [x] **BacklogPanel 입력 단순화** — textarea + 추가 버튼만 상단 배치. Enter=추가, Shift+Enter=줄바꿈. kind 선택 제거(기본 task). 날짜/기간/메모 입력 UI 제거(추가·편집은 디테일에서).
- [x] **태그 선택** — 입력 영역 아래에 태그 행: 기존 태그 칩(일반 + 백로그 항목에서 추출) + "+ 새 태그" 입력란. 선택 안 하면 기본 "일반". 새 태그 입력 시 해당 태그로 생성.
- [x] **목록 태그별 그룹** — 백로그 목록을 태그별로 그룹화해 표시(그룹 헤더: 태그명 + 개수). 그룹 내·그룹 간 정렬은 updatedAt 기준(최근 수정 먼저).
- [x] **백로그 표시 개수 설정** — AppSettings에 `backlogDisplayLimit: number | null`. null=전부 보기, N=최근 N개만(updatedAt 기준). 설정 패널에 "표시 개수: 전부 보기 / 최근 50·100·200개" 옵션 추가.
- [x] **PRD 반영** — prd_v2.md §6.4·§11.4, prd_v2_ux.md §7, prd_v2_entity.md 태그 항목 수정. **수정 전/후 기록**: [docs/PRD_CHANGELOG.md](PRD_CHANGELOG.md).

---

## 미구현 항목 (다음 작업 순서)

### Phase 2 — 핵심 인터랙션
- [x] 셀 클릭(pan) → 단일 날짜 선택 + 좌측 **백로그** 패널 자동 포커스
- [x] 셀 더블클릭 → 셀 확장 (항목 목록 인라인 표시)
- [x] select 모드 드래그 → 다중 날짜(`days`) 선택 + 백로그 자동 포커스; **연속 구간**에서 백로그 추가 시 `createRange` + item (**기간 막대용 range 생성 완료**)
- [ ] 보드에서 **입력 없이** 제스처만으로 range 확정 (선택 사항; 현재는 백로그·range Detail 입력 경로)
- [ ] Context menu (우클릭 / long press)
- [x] Range 선택 및 DetailPanel 편집
- [ ] Overlay 선택/이동/리사이즈
- [ ] 키보드 단축키 (1=pan, 2=select, 3=draw, 4=place)

### Phase 3 — 패널 내부 완성
- [x] Detail 패널 — item 상세 편집 (title, body, status)
- [x] Detail 패널 — range 상세 편집 (label, body, kind, status, color)
- [ ] Detail 패널 — overlay 속성 편집
- [ ] Search 패널 — 전체 검색
- [x] Filter 패널 — view filter (`FilterPanel.tsx`: 태그 OR, hide done, 기간 막대 표시 토글; **Item.kind 기반 필터 아님**)
- [x] Tags 패널 — 태그 목록·개수, **새 태그 추가**(빈 제목 백로그 item + 해당 태그), 이름 변경(일괄), 제거 시 다른 태그로 이동 (좌측 `ranges` 슬롯을 `tags`로 교체)
- [ ] Ranges 패널 — range 목록 관리 (별도 메뉴 없음; 보드·디테일에서 관리)
- [ ] Overlays 패널 — overlay 목록 관리
- [ ] Layers 패널 — 레이어 show/hide

### Phase 4 — 저장/동기화
- [ ] IndexedDB (Dexie) 연동
- [ ] Autosave (debounce)
- [ ] Dirty flag 기반 저장
- [ ] Board load/save 흐름
- [ ] Multi-board 지원
- [ ] Migration 구조

### Phase 5 — Export/Import
- [ ] JSON full backup export
- [ ] JSON import (replace/merge)
- [ ] ICS export
- [ ] ICS import
- [ ] PNG high-resolution export
- [ ] Selection export
- [ ] Layer export

### Phase 6 — 시각 요소
- [ ] Overlay/Sticker 시스템 완성
  - [ ] 스티커 생성/배치
  - [ ] 텍스트 오버레이
  - [ ] 이미지 업로드
  - [ ] Shape 오버레이
  - [ ] Anchor 시스템 (none/month/day/range)
  - [ ] Lock/Unlock
  - [ ] 줌 단계별 존재감 조절
- [ ] Range 시각 완성
  - [ ] Range progress bar
  - [ ] Range 상태별 색상 변화
  - [ ] Range label 줌별 표시
- [ ] 주(week) 구분선 (선택적 UI)
- [ ] 월 헤더 디자인 개선

### Phase 7 — 테마/설정
- [ ] 다크 모드
- [ ] 테마 커스터마이징 UI (설정 패널)
- [ ] 폰트 변경
- [ ] 색상 팔레트 변경
- [ ] 주 시작 요일 설정

### Phase 8 — 모바일 최적화
- [ ] 터치 제스처 충돌 해결 (pinch vs pan vs select)
- [ ] 모바일 패널 전체 폭 확장
- [ ] Long press 메뉴
- [ ] Double tap 줌

### Phase 9 — 고급 기능
- [ ] Undo/Redo
- [ ] Command log
- [ ] 동기화 구조 (version, conflict)
- [ ] Google Drive 백업
- [ ] 로그인/세션 유지
- [ ] Toast 알림 시스템

### Phase 10 — AI/MCP 대응
- [ ] Command 구조를 external API로 노출
- [ ] MCP server 구조
- [ ] JSON 입력 기반 command 실행

---

## 파일 구조

```
src/
├── App.tsx                     # 메인 레이아웃
├── App.css
├── main.tsx                    # 엔트리 포인트
├── types/
│   ├── entities.ts             # 5개 엔티티 타입
│   ├── state.ts                # AppState, ViewState, PanelState
│   ├── commands.ts             # 커맨드 타입 정의
│   ├── view-models.ts          # DayCellViewModel, 줌 정책
│   └── index.ts
├── store/
│   └── board-store.ts          # Zustand store + command actions
├── hooks/
│   └── useZoomPan.ts           # 줌/팬 커스텀 훅
├── utils/
│   ├── date.ts                 # 날짜 유틸리티
│   ├── zoom.ts                 # 줌 레벨 계산, 상수
│   ├── indexing.ts             # 날짜 인덱싱 유틸
│   └── id.ts                   # nanoid 래퍼
├── theme/
│   ├── theme.css               # CSS 변수 정의
│   └── global.css              # 글로벌 리셋
└── components/
    ├── board/
    │   ├── YearBoard.tsx        # 메인 보드
    │   ├── YearBoard.css
    │   ├── MonthRow.tsx         # 월별 행 (linear/aligned 레이아웃 지원)
    │   ├── DayCell.tsx          # 날짜 셀 (요일 표시 포함)
│   ├── ExpandedCell.tsx    # 더블클릭 확장 셀 오버레이
│   ├── RangePreview.tsx   # (구현만 있음, 보드에 미연결 — 향후 드래그 프리뷰 등)
│   └── WeekdayHeader.tsx    # weekday-aligned 모드 상단 요일 헤더
    ├── icons/
    │   └── Icons.tsx            # SVG 벡터 아이콘 모음
    ├── toolbar/
    │   ├── TopToolbar.tsx       # 상단 도구 모음
    │   └── TopToolbar.css
    └── panels/
        ├── LeftIconBar.tsx      # 좌측 아이콘바
        ├── LeftIconBar.css
        ├── LeftPanel.tsx        # 좌측 작업 패널
        ├── LeftPanel.css
        ├── BacklogPanel.tsx     # 백로그 패널
        ├── BacklogPanel.css
        ├── DetailPanel.tsx      # 상세 편집 패널 (좌측)
        ├── DetailPanel.css
        ├── FilterPanel.tsx      # 보드 뷰 필터
        ├── TagsPanel.tsx        # 태그 일괄 이름 변경·제거
        ├── RightPanel.tsx       # 우측 시스템 패널
        ├── RightPanel.css
        ├── SettingsPanel.tsx    # 설정 패널 (레이아웃/줌 설정)
        └── SettingsPanel.css
```

---

## 설계 원칙 준수 현황

| 원칙 | 상태 | 비고 |
|------|------|------|
| Canvas first | ✅ | SVG 기반 보드 중심 |
| Year first | ✅ | 12개월 전체 한 화면 |
| Zoom driven | ✅ | Z0~Z4 5단계 정보 밀도 |
| Range based | ✅ | 기간은 백로그·디테일·`createRange`; 보드 draw 제스처는 제거됨 |
| Overlay based | ✅ 기초 | 타입/저장 구현, 배치/편집 미완 |
| Local first | 🔲 | Dexie 설치됨, 연동 미완 |
| Command based | ✅ | Zustand actions = commands |
| Minimal chrome | ✅ | 반투명 툴바, 패널 숨김 기본 |
| Mobile capable | ✅ 기초 | 핀치줌/터치 대응, 모바일 최적화 미완 |
| Portable data | 🔲 | Export/Import 미구현 |
