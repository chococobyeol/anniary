# Panel UX Spec v2 — Linear Year Planner / Canvas Calendar

## 1. 목적

패널 구조는 보드를 중심으로 유지하면서  
작업 기능을 빠르게 접근할 수 있도록 설계한다.

원칙

- 보드가 항상 메인
- 패널은 보조 UI
- 작업 기능은 좌측에 집중
- 시스템 기능은 우측에 분리
- 상세 편집은 선택 기반 inspector 방식
- 패널은 overlay 방식 유지
- 보드 좌표 / 줌 / 캔버스 레이아웃은 패널에 의해 변하지 않는다

---

## 2. 전체 레이아웃 구조

최종 구조

```

│ Left Icon Bar │ Left Panel │ Board │ Right Panel │

```

또는 Right Panel 없이

```

│ Left Icon Bar │ Left Panel │ Board │

```

상단에는 항상 전역 툴바가 존재한다.

```

Top Toolbar (overlay)

```

구성

- Top Toolbar = 전역 액션 / 모드
- Left Icon Bar = 패널 종류 선택
- Left Panel = 작업 패널
- Board = 메인 캔버스
- Right Panel = 시스템 / 설정 / 계정 (옵션)

---

## 3. 패널 역할 분리

### Left Panel

작업 관련 기능

- backlog
- search
- filter
- layers
- ranges
- overlays
- detail inspector

### Right Panel

앱 / 시스템 관련 기능

- settings
- account
- sync
- export
- theme
- help
- sponsor

### Board

메인 작업 공간

### Top Toolbar

전역 액션 / 모드 / 생성 / 검색

---

## 4. Left Icon Bar

좌측에는 항상 아이콘 바가 존재한다.

폭은 좁게 유지한다.

예

```

⏳ backlog
🔍 search
⚙ filter
📦 layers
📅 ranges
⭐ overlays
📄 detail

```

아이콘 클릭 → Left Panel 모드 변경

아이콘 바는 항상 고정

패널은 열렸다 닫힐 수 있음

---

## 5. Left Panel

Left Panel은 작업 패널이다.

열림 상태

```

│icons│panel│board│

```

닫힘 상태

```

│icons│board│

```

패널은 overlay 방식

- 보드 크기 재계산 없음
- 캔버스 좌표 유지
- 줌 유지

---

## 6. Left Panel 모드

```

type LeftPanelMode =
| 'backlog'
| 'search'
| 'filter'
| 'layers'
| 'ranges'
| 'overlays'
| 'detail'

```

mode는 icon 선택으로 변경된다.

---

## 7. backlog 모드

목적

- 날짜 없는 item 관리
- 빠른 생성
- 빠른 편집

포함

- no-date task
- no-date note
- range 미할당 item
- date 미할당 item

기능

- create item
- edit title
- set status
- assign date
- assign range
- open detail
- drag to board

정렬 기본

- pinned
- in-progress
- updated desc

---

## 8. search 모드

목적

보드 전체 검색

검색 대상

- item.title
- item.body
- range.label
- range.body
- overlay.text

결과 표시

- type
- title
- date / range
- click → board focus
- click → highlight
- click → detail open

동작

```

search
→ result select
→ board move
→ highlight
→ detail optional

```

검색은 패널에서 결과를 보여주고  
보드는 이동만 한다.

---

## 9. filter 모드

목적

보드 표시 축소 / 강조

필터 예

- in-progress only
- hide done
- task only
- note only
- event only
- overlay only
- range only
- memo only

필터는 state 변경이 아니라

view filter

---

## 10. layers 모드

목적

시각 레이어 제어

대상

- overlay
- decorative overlay
- semantic overlay
- range highlight
- item markers

기능

- show / hide
- toggle
- opacity group

초기 v1에서는 옵션

---

## 11. ranges 모드

목적

range 목록 관리

기능

- range list
- jump to range
- edit range
- delete range
- create range

range 클릭

→ board focus
→ highlight
→ detail

---

## 12. overlays 모드

목적

overlay 목록 관리

기능

- overlay list
- toggle visible
- lock
- delete
- jump to overlay
- edit overlay

overlay 클릭

→ board focus
→ select overlay
→ detail open

---

## 13. detail 모드

선택된 대상 상세 편집

대상

- item
- range
- overlay
- day

detail 모드는 selection 기반

selection 없으면 empty

```

detail = inspector

```

---

## 14. Detail 모드 규칙

mode는 유지

selection 변경 → detail 갱신

panel 자동 전환 없음

아이콘 선택해야 detail 모드

옵션

auto open 가능

---

## 15. Detail — item

편집

- kind
- title
- body
- date
- range
- status
- progress
- pinned

액션

- duplicate
- delete

---

## 16. Detail — range

편집

- startDate
- endDate
- label
- body
- status
- color

보기

- linked items

---

## 17. Detail — overlay

편집

- type
- role
- x
- y
- width
- height
- opacity
- locked
- anchor
- asset
- text

---

## 18. Detail — day

보기

- item list
- range list
- add item
- quick status

day는 container view

---

## 19. Right Panel

Right Panel은 작업 패널이 아니다.

용도

- settings
- account
- sync
- export
- theme
- help
- sponsor

Right Panel은 선택 기반 아님

앱 상태 기반

```

type RightPanelMode =
| 'settings'
| 'account'
| 'sync'
| 'export'
| 'theme'
| 'help'
| 'about'

```

Right Panel은 옵션

없어도 됨

---

## 20. Top Toolbar

항상 존재

overlay UI

반투명

목적

- 전역 액션
- interaction mode
- 생성
- 검색

---

## 21. Interaction Mode 버튼

필수

```

pan
select
draw
place

```

예

```

🖐 ⬚ ✏ ⭐

```

mode는 global state

---

## 22. 생성 버튼

상단에 존재

- sticker
- image
- draw
- text
- range

생성 클릭

→ place mode

---

## 23. 검색 버튼

상단에서 호출 가능

검색 실행

→ left panel search 열림
→ 결과 표시
→ 선택 시 이동

---

## 24. 패널 동작 규칙

패널은 overlay

보드 레이아웃 변경 없음

허용

- pan
- zoom
- select
- mode 변경

패널 열려도 작업 가능

---

## 25. 모바일 규칙

구조 동일

차이

panel width = full

icon bar = overlay

right panel = full sheet

left panel = full sheet

mode 유지

---

## 26. 저장 규칙

autosave

패널 입력 즉시 반영

command 호출

저장 버튼 없음

---

## 27. 패널과 command 연결

패널은 직접 state 변경 안 함

모든 변경은 command

예

updateItem
moveItemToDate
assignItemToRange
setOverlayLock
resizeRange

---

## 28. 최소 구현 세트

필수

- icon bar
- left panel
- backlog
- search
- filter
- detail
- top toolbar
- interaction mode

선택

- ranges panel
- overlays panel
- layers
- right panel

---

## 29. v1 제외

- multi panel
- docking
- resize panel
- custom layout
- multi inspector
- collaboration panel
- history panel

---

## 30. 최종 원칙

- 보드 중심 구조
- 좌측 작업 패널
- 좌측 아이콘 모드 선택
- 우측 시스템 패널
- 상단 전역 툴바
- interaction mode 필수
- 생성은 상단
- 상세는 detail panel
- 패널 overlay 방식
- autosave
- command 기반 변경

