# Command 구조 v2 — Linear Year Planner / Canvas Calendar

## 1. 목적

command 구조의 목적은 다음이다.

* UI와 도메인 로직 분리
* 버튼 / 패널 / 단축키 / AI / MCP / CLI가 같은 동작 호출
* 상태 변경을 예측 가능하게 유지
* 저장 / 동기화 / undo 확장 가능하게 만들기

즉 구조 원칙은 아래다.

```txt
UI / AI / MCP / CLI
        ↓
Intent Layer
        ↓
Normalize / Validate
        ↓
Core Domain Apply Layer
        ↓
State
        ↓
Storage / Sync
```

읽기 계열은 별도로 둔다.

```txt
UI / AI / MCP / CLI
        ↓
Query Layer
        ↓
State
```

---

## 2. 최종 구조 분류

초기 v1보다 정리된 최종 분류는 아래 5개다.

1. **Domain Commands**
2. **Resource Commands**
3. **Import Commands**
4. **Export Actions**
5. **Queries**

핵심은 다음이다.

* **command는 상태 변경 중심**
* **AI/MCP용 외부 인터페이스는 명시적 intent 중심**
* **내부 구현은 공통 patch/apply 계층으로 수렴**
* **export는 state write command로 보지 않음**
* **asset은 domain보다는 resource 계층으로 분리**

---

## 3. 기본 원칙

### 3.1 외부에는 intent-specific command를 둔다

AI / MCP / CLI / UI 액션용 인터페이스는
의미가 분명한 명령 이름을 유지한다.

좋은 예

```txt
createItem
moveItemToDate
assignItemToRange
setItemStatus
moveOverlay
setOverlayLock
```

나쁜 예

```txt
editSomething
modifyState
handlePanelAction
```

---

### 3.2 내부 구현은 소수의 공통 apply 계층으로 수렴한다

외부 command는 많아도
내부 상태 변경 로직은 적어야 한다.

예시

```txt
moveItemToDate
→ validate
→ normalize to item patch
→ applyItemPatch
```

```txt
setItemStatus
→ validate
→ normalize to item patch
→ applyItemPatch
```

즉 외부는 명시적이어도
내부는 `applyItemPatch`, `applyRangePatch`, `applyOverlayPatch` 같은 구조로 수렴한다.

---

### 3.3 command는 deterministic 해야 한다

같은 입력이면 같은 결과가 나와야 한다.

즉 command는

* hover 상태
* 현재 포커스
* 일시적 UI 상태

같은 값에 의존하면 안 된다.

---

### 3.4 입력은 JSON 직렬화 가능해야 한다

AI / MCP / CLI 대응 때문에
모든 입력은 JSON으로 표현 가능해야 한다.

---

### 3.5 조회는 command가 아니라 query다

아래는 command가 아니다.

* backlog 목록 조회
* 특정 날짜 셀 데이터 계산
* 검색 결과
* 필터 결과
* 현재 selection 기준 렌더 데이터 계산
* 줌 단계 계산
* export preview

이건 query 계층이다.

---

## 4. 공통 envelope

모든 외부 호출은 아래 구조를 따른다.

```ts
type Envelope<TType extends string, TPayload> = {
  type: TType
  payload: TPayload

  commandId?: string
  issuedAt?: string
  actor?: 'user' | 'system' | 'ai'
}
```

---

## 5. 내부 실행 계층

외부 intent command는
내부에서 아래 apply 계층으로 수렴한다.

```ts
type CoreApplyOp =
  | { type: 'insertEntity'; entityType: 'board' | 'item' | 'range' | 'overlay' | 'asset'; entity: unknown }
  | { type: 'patchEntity'; entityType: 'board' | 'item' | 'range' | 'overlay' | 'asset'; entityId: string; patch: Record<string, unknown> }
  | { type: 'removeEntity'; entityType: 'board' | 'item' | 'range' | 'overlay' | 'asset'; entityId: string }
```

실제 구현에서는 엔티티별 apply 함수로 나누는 쪽이 더 낫다.

```ts
applyBoardPatch()
applyItemPatch()
applyRangePatch()
applyOverlayPatch()
applyAssetPatch()
```

핵심은
**외부 command 수와 내부 mutation entry 수를 분리**하는 것이다.

---

# 6. Domain Commands

도메인 상태를 직접 바꾸는 명령이다.

대상 엔티티:

* board
* item
* range
* overlay

---

## 6.1 Board Commands

### createBoard

```ts
type CreateBoardCommand = Envelope<
  'createBoard',
  {
    year: number
    title?: string
    weekStart?: 'monday' | 'sunday'
  }
>
```

### updateBoard

```ts
type UpdateBoardCommand = Envelope<
  'updateBoard',
  {
    boardId: string
    patch: {
      title?: string
      weekStart?: 'monday' | 'sunday'
    }
  }
>
```

### duplicateBoard

```ts
type DuplicateBoardCommand = Envelope<
  'duplicateBoard',
  {
    boardId: string
    newYear?: number
    title?: string
  }
>
```

### deleteBoard

```ts
type DeleteBoardCommand = Envelope<
  'deleteBoard',
  {
    boardId: string
  }
>
```

---

## 6.2 Item Commands

### createItem

```ts
type CreateItemCommand = Envelope<
  'createItem',
  {
    boardId: string
    kind: 'task' | 'note' | 'event'
    title?: string
    body?: string
    date?: string
    rangeId?: string
    status?: 'none' | 'in-progress' | 'done' | 'delayed' | 'important'
    progress?: number
    pinned?: boolean
  }
>
```

### updateItem

```ts
type UpdateItemCommand = Envelope<
  'updateItem',
  {
    itemId: string
    patch: {
      kind?: 'task' | 'note' | 'event'
      title?: string
      body?: string
      date?: string | null
      rangeId?: string | null
      status?: 'none' | 'in-progress' | 'done' | 'delayed' | 'important'
      progress?: number | null
      pinned?: boolean
    }
  }
>
```

### deleteItem

```ts
type DeleteItemCommand = Envelope<
  'deleteItem',
  {
    itemId: string
  }
>
```

### moveItemToDate

```ts
type MoveItemToDateCommand = Envelope<
  'moveItemToDate',
  {
    itemId: string
    date: string | null
  }
>
```

### assignItemToRange

```ts
type AssignItemToRangeCommand = Envelope<
  'assignItemToRange',
  {
    itemId: string
    rangeId: string | null
  }
>
```

### setItemStatus

```ts
type SetItemStatusCommand = Envelope<
  'setItemStatus',
  {
    itemId: string
    status: 'none' | 'in-progress' | 'done' | 'delayed' | 'important'
  }
>
```

### setItemProgress

```ts
type SetItemProgressCommand = Envelope<
  'setItemProgress',
  {
    itemId: string
    progress: number | null
  }
>
```

### pinItem

```ts
type PinItemCommand = Envelope<
  'pinItem',
  {
    itemId: string
    pinned: boolean
  }
>
```

### duplicateItem

```ts
type DuplicateItemCommand = Envelope<
  'duplicateItem',
  {
    itemId: string
    targetDate?: string
    targetRangeId?: string | null
  }
>
```

#### 내부 정규화 원칙

아래 command들은 내부적으로 `updateItem patch`로 수렴 가능하다.

* moveItemToDate
* assignItemToRange
* setItemStatus
* setItemProgress
* pinItem

즉 외부에는 intent별 command를 유지하되,
내부 mutation은 item patch 중심으로 통합한다.

---

## 6.3 Range Commands

### createRange

```ts
type CreateRangeCommand = Envelope<
  'createRange',
  {
    boardId: string
    kind: 'period' | 'note' | 'highlight'
    startDate: string
    endDate: string
    label?: string
    body?: string
    status?: 'none' | 'active' | 'done' | 'delayed'
    color?: string
  }
>
```

### updateRange

```ts
type UpdateRangeCommand = Envelope<
  'updateRange',
  {
    rangeId: string
    patch: {
      kind?: 'period' | 'note' | 'highlight'
      startDate?: string
      endDate?: string
      label?: string
      body?: string
      status?: 'none' | 'active' | 'done' | 'delayed'
      color?: string
    }
  }
>
```

### deleteRange

```ts
type DeleteRangeCommand = Envelope<
  'deleteRange',
  {
    rangeId: string
    detachItems?: boolean
  }
>
```

### moveRange

```ts
type MoveRangeCommand = Envelope<
  'moveRange',
  {
    rangeId: string
    dayOffset: number
  }
>
```

### resizeRange

```ts
type ResizeRangeCommand = Envelope<
  'resizeRange',
  {
    rangeId: string
    startDate?: string
    endDate?: string
  }
>
```

### setRangeStatus

```ts
type SetRangeStatusCommand = Envelope<
  'setRangeStatus',
  {
    rangeId: string
    status: 'none' | 'active' | 'done' | 'delayed'
  }
>
```

#### 내부 정규화 원칙

아래 command들은 내부적으로 `updateRange patch`로 수렴 가능하다.

* moveRange
* resizeRange
* setRangeStatus

---

## 6.4 Overlay Commands

### createOverlay

```ts
type CreateOverlayCommand = Envelope<
  'createOverlay',
  {
    boardId: string
    type: 'sticker' | 'text' | 'shape' | 'image'
    role: 'semantic' | 'decorative'
    x: number
    y: number
    width: number
    height: number
    opacity?: number
    locked?: boolean
    anchorType?: 'none' | 'month'
    anchorId?: string
    text?: string
    assetId?: string
  }
>
```

### updateOverlay

```ts
type UpdateOverlayCommand = Envelope<
  'updateOverlay',
  {
    overlayId: string
    patch: {
      role?: 'semantic' | 'decorative'
      x?: number
      y?: number
      width?: number
      height?: number
      opacity?: number
      locked?: boolean
      anchorType?: 'none' | 'month'
      anchorId?: string | null
      text?: string
      assetId?: string | null
    }
  }
>
```

### deleteOverlay

```ts
type DeleteOverlayCommand = Envelope<
  'deleteOverlay',
  {
    overlayId: string
  }
>
```

### moveOverlay

```ts
type MoveOverlayCommand = Envelope<
  'moveOverlay',
  {
    overlayId: string
    x: number
    y: number
  }
>
```

### resizeOverlay

```ts
type ResizeOverlayCommand = Envelope<
  'resizeOverlay',
  {
    overlayId: string
    width: number
    height: number
  }
>
```

### setOverlayLock

```ts
type SetOverlayLockCommand = Envelope<
  'setOverlayLock',
  {
    overlayId: string
    locked: boolean
  }
>
```

### duplicateOverlay

```ts
type DuplicateOverlayCommand = Envelope<
  'duplicateOverlay',
  {
    overlayId: string
    offsetX?: number
    offsetY?: number
  }
>
```

#### 내부 정규화 원칙

아래 command들은 내부적으로 `updateOverlay patch`로 수렴 가능하다.

* moveOverlay
* resizeOverlay
* setOverlayLock

---

# 7. Resource Commands

asset은 core domain entity이긴 하지만
성격상 **resource / storage layer**에 더 가깝다.

즉 item / range / overlay와 같은 레벨의 pure domain command로 보지 않고
별도 resource command로 분리한다.

## 7.1 registerAsset

```ts
type RegisterAssetCommand = Envelope<
  'registerAsset',
  {
    boardId: string
    type: 'image'
    sourceType: 'builtin' | 'user' | 'external'
    storageKey: string
    mimeType?: string
    width?: number
    height?: number
  }
>
```

## 7.2 deleteAsset

```ts
type DeleteAssetCommand = Envelope<
  'deleteAsset',
  {
    assetId: string
    detachFromOverlays?: boolean
  }
>
```

---

# 8. Import Commands

import는 외부 데이터를 상태에 반영하므로 command다.

## 8.1 importJson

```ts
type ImportJsonCommand = Envelope<
  'importJson',
  {
    boardId?: string
    mode: 'replace' | 'merge'
    data: unknown
  }
>
```

## 8.2 importIcs

```ts
type ImportIcsCommand = Envelope<
  'importIcs',
  {
    boardId: string
    data: string
    mode?: 'append' | 'merge'
  }
>
```

---

# 9. Export Actions

export는 AI/MCP/tool 인터페이스로는 노출할 수 있지만
**도메인 상태를 바꾸는 command로 보지 않는다.**

즉 분류는 action / job 이다.

## 9.1 exportJson

```ts
type ExportJsonAction = Envelope<
  'exportJson',
  {
    boardId: string
    scope?: 'full' | 'selection' | 'layer'
  }
>
```

## 9.2 exportIcs

```ts
type ExportIcsAction = Envelope<
  'exportIcs',
  {
    boardId: string
    itemIds?: string[]
    rangeIds?: string[]
  }
>
```

## 9.3 exportPng

```ts
type ExportPngAction = Envelope<
  'exportPng',
  {
    boardId: string
    scope: 'full' | 'selection' | 'layer'
    resolution?: 'standard' | 'high' | 'print'
    includeOverlays?: boolean
  }
>
```

---

# 10. Queries

query는 read 전용 계층이다.

예시:

* `getBoardById`
* `getDayCellViewModel`
* `getBacklogItems`
* `getItemsForDate`
* `getItemsForRange`
* `getVisibleOverlays`
* `searchBoard`
* `getFilterResult`
* `getZoomLevelPolicy`
* `buildExportPreview`

핵심 원칙:

```txt
command / action = write or execute
query = read
```

---

# 11. Patch 규칙

`updateX` 계열 command는 모두 patch 방식으로 간다.

원칙:

* 지정한 필드만 변경
* 누락된 필드는 유지
* `null`은 명시적 해제
* `undefined`는 변경 없음

예:

```ts
{
  type: 'updateItem',
  payload: {
    itemId: 'i1',
    patch: {
      date: null
    }
  }
}
```

의미:

* item의 대표 date 제거

---

# 12. Validation 규칙

모든 command/action은 실행 전 validation을 거친다.

## 12.1 공통

* 대상 id 존재 여부
* board 소속 일치 여부
* enum 유효성
* 필수 필드 존재 여부

## 12.2 Item

* progress는 0~100 또는 null
* kind 유효성 확인
* date 형식 확인
* rangeId 존재 시 range 존재 확인

## 12.3 Range

* `startDate <= endDate`
* kind 유효성
* status 유효성

## 12.4 Overlay

* width/height 최소값 이상
* locked 상태에서 move/resize 제한
* assetId 존재 시 asset 존재 확인

## 12.5 Asset

* storageKey 유효성
* sourceType 유효성
* mimeType 허용 여부 확인 가능

## 12.6 Import

* JSON/ICS 파싱 가능 여부
* merge/replace 모드 유효성
* entity 충돌 전략 확인

## 12.7 Export

* board 존재 여부
* scope 유효성
* resolution 유효성
* export 대상 selection/layer 유효성

---

# 13. 실행 결과 구조

권장 결과 구조:

```ts
type ExecutionResult = {
  ok: boolean
  changedEntityIds?: string[]
  createdEntityIds?: string[]
  deletedEntityIds?: string[]
  errorCode?: string
  message?: string
}
```

export action은 파일/산출물 메타를 반환할 수 있다.

```ts
type ExportResult = {
  ok: boolean
  artifactType: 'json' | 'ics' | 'png'
  fileName?: string
  blobRef?: string
  errorCode?: string
  message?: string
}
```

---

# 14. 최소 구현 세트

실제 v1에서 가장 먼저 필요한 세트만 줄이면 아래다.

## Domain Commands

* createBoard

* updateBoard

* createItem

* updateItem

* deleteItem

* moveItemToDate

* assignItemToRange

* setItemStatus

* setItemProgress

* pinItem

* createRange

* updateRange

* deleteRange

* moveRange

* resizeRange

* createOverlay

* updateOverlay

* deleteOverlay

* moveOverlay

* resizeOverlay

* setOverlayLock

## Resource Commands

* registerAsset
* deleteAsset

## Import Commands

* importJson
* importIcs

## Export Actions

* exportJson
* exportIcs
* exportPng

## Queries

* getDayCellViewModel
* getBacklogItems
* getItemsForDate
* getItemsForRange
* getVisibleOverlays
* getZoomLevelPolicy

---

# 15. v1에서 아직 넣지 않는 것

초기에는 제외한다.

* undo / redo
* batch command
* bulk edit
* z-index reorder
* recurrence command
* tag attach/detach
* reminder command
* sync resolve command
* conflict merge command

나중에 추가 가능하다.

---

# 16. 최종 원칙

* 외부 인터페이스는 **intent-specific command/action** 으로 둔다
* 내부 상태 변경은 **소수의 공통 patch/apply 계층** 으로 수렴시킨다
* command는 상태 변경 중심이다
* import는 command다
* export는 command가 아니라 action/job이다
* asset은 pure domain command가 아니라 resource 계층으로 분리한다
* query는 read 전용으로 분리한다
* 입력은 모두 JSON 직렬화 가능해야 한다
* AI / MCP / CLI / UI는 같은 intent layer를 호출한다

---

# 17. 다음 단계

다음은 **패널 UX 규격 v1**이다.
