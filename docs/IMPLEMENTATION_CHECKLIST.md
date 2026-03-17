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

---

## 미구현 항목 (다음 작업 순서)

### Phase 2 — 핵심 인터랙션
- [ ] 셀 클릭 → 우측 패널 상세 열기 (select 모드)
- [ ] 셀 더블클릭 → 빠른 item 생성
- [ ] 날짜 드래그 선택 → range 생성
- [ ] Context menu (우클릭 / long press)
- [ ] Range 선택 및 하이라이트
- [ ] Overlay 선택/이동/리사이즈
- [ ] 키보드 단축키 (1=pan, 2=select, 3=draw, 4=place)

### Phase 3 — 패널 내부 완성
- [ ] Detail 패널 — item 상세 편집 (title, body, status, progress, date, range)
- [ ] Detail 패널 — range 상세 편집
- [ ] Detail 패널 — overlay 속성 편집
- [ ] Search 패널 — 전체 검색
- [ ] Filter 패널 — view filter
- [ ] Ranges 패널 — range 목록 관리
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
│   └── id.ts                   # nanoid 래퍼
├── theme/
│   ├── theme.css               # CSS 변수 정의
│   └── global.css              # 글로벌 리셋
└── components/
    ├── board/
    │   ├── YearBoard.tsx        # 메인 보드
    │   ├── YearBoard.css
    │   ├── MonthRow.tsx         # 월별 행
    │   └── DayCell.tsx          # 날짜 셀
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
        ├── DetailPanel.tsx      # 상세 패널
        ├── RightPanel.tsx       # 우측 시스템 패널
        └── RightPanel.css
```

---

## 설계 원칙 준수 현황

| 원칙 | 상태 | 비고 |
|------|------|------|
| Canvas first | ✅ | SVG 기반 보드 중심 |
| Year first | ✅ | 12개월 전체 한 화면 |
| Zoom driven | ✅ | Z0~Z4 5단계 정보 밀도 |
| Range based | ✅ 기초 | 타입/저장/표시 구현, 생성 UX 미완 |
| Overlay based | ✅ 기초 | 타입/저장 구현, 배치/편집 미완 |
| Local first | 🔲 | Dexie 설치됨, 연동 미완 |
| Command based | ✅ | Zustand actions = commands |
| Minimal chrome | ✅ | 반투명 툴바, 패널 숨김 기본 |
| Mobile capable | ✅ 기초 | 핀치줌/터치 대응, 모바일 최적화 미완 |
| Portable data | 🔲 | Export/Import 미구현 |
