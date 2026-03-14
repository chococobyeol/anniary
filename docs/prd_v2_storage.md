# Storage / State / Sync Spec v1 — Linear Year Planner / Canvas Calendar

## 1. 목적

storage / state 구조의 목적

- autosave 가능
- command 기반 변경 기록 가능
- undo 확장 가능
- import/export 가능
- local-first 가능
- sync 확장 가능
- 대용량 보드에서도 안정 동작
- 렌더 구조와 분리

원칙

- state = 메모리
- storage = 영속 저장
- command = 변경 입력
- apply = 상태 변경
- persist = 저장

---

## 2. 기본 구조

```

Command
→ validate
→ normalize
→ apply(state)
→ persist(storage)
→ notify(render)

```

read 흐름

```

query
→ state
→ view model
→ render

```

---

## 3. local-first 원칙

초기 설계는 local-first 기준으로 한다.

의미

- 항상 로컬에 저장
- 서버 없어도 동작
- sync는 선택 기능
- autosave 기본

즉

```

memory state
+
local storage
+
optional sync

```

---

## 4. 저장 단위

최상위 단위

```

board

```

모든 데이터는 board에 속한다.

```

boards
└ board
├ items
├ ranges
├ overlays
├ assets

````

board 단위 저장 가능해야 한다.

---

## 5. State 구조

메모리 state

```ts
type RootState = {
  boards: Record<string, BoardState>
}
````

board 내부

```ts
type BoardState = {
  board: BoardEntity

  items: Record<string, ItemEntity>
  ranges: Record<string, RangeEntity>
  overlays: Record<string, OverlayEntity>
  assets: Record<string, AssetEntity>

  meta: BoardMetaState
}
```

meta는 runtime 상태

---

## 6. BoardMetaState

저장 안 해도 되는 값

```ts
type BoardMetaState = {
  selection?: SelectionState
  view?: ViewState
  panel?: PanelState
}
```

meta는 persistence 대상 아님.

---

## 7. Entity 저장 방식

정규화 구조 사용

좋은 구조

```
items: Record<id, Item>
```

나쁜 구조

```
items: Item[]
```

이유

* 빠른 접근
* patch 쉬움
* undo 쉬움
* sync 쉬움

---

## 8. Entity ID 규칙

모든 엔티티는 id 가진다.

```
boardId
itemId
rangeId
overlayId
assetId
```

id는 string

UUID 또는 nanoid

---

## 9. Persistence 구조

저장 대상

```
board
items
ranges
overlays
assets
```

저장 안 하는 것

```
selection
panel state
zoom
hover
drag state
```

---

## 10. 저장 위치

초기 권장

```
IndexedDB
```

이유

* 용량 큼
* 이미지 가능
* async 가능
* 구조 저장 가능

대안

* localStorage (작음)
* file json (export용)
* sqlite (native용)

웹 기준

```
IndexedDB
```

---

## 11. 저장 형식

board 단위 저장

```ts
type StoredBoard = {
  board: BoardEntity
  items: ItemEntity[]
  ranges: RangeEntity[]
  overlays: OverlayEntity[]
  assets: AssetEntity[]
}
```

또는

```ts
{
  board,
  items,
  ranges,
  overlays,
  assets
}
```

정규화 해제해서 저장 가능

---

## 12. autosave 규칙

command 실행 후 저장

```
apply
→ mark dirty
→ debounce
→ persist
```

debounce 필요

예

```
200ms ~ 1000ms
```

---

## 13. dirty flag

board 단위 dirty

```ts
type BoardMetaState = {
  dirty: boolean
}
```

command 실행

```
dirty = true
```

persist 성공

```
dirty = false
```

---

## 14. persistence 트리거

저장 트리거

* command 실행
* 일정 시간 idle
* 앱 종료
* 탭 숨김
* export 전

---

## 15. command 로그 (선택)

초기 v1

로그 필수 아님

하지만 확장 고려

```ts
type CommandLog = {
  id: string
  type: string
  payload: unknown
  time: number
}
```

나중에

* undo
* sync
* history

가능

---

## 16. undo 구조 (v1 설계만)

undo는 snapshot 또는 patch

추천

patch 기반

```
before
after
```

또는

command inverse

초기 구현 안 해도 됨

하지만 구조는 가능해야 한다.

---

## 17. version

board version 필요

```ts
type BoardEntity = {
  id: string
  year: number
  version: number
}
```

migration 가능

---

## 18. migration

저장 구조 변경 대비

```ts
type StoredBoard = {
  version: number
  data: unknown
}
```

load 시

```
if version mismatch
 → migrate
```

---

## 19. asset 저장

asset은 별도 저장

구조

```
assets table
files storage
```

asset entity

```
id
storageKey
type
```

파일은

* IndexedDB blob
* file system
* url

---

## 20. asset storageKey

예

```
asset/boardId/assetId
```

또는

```
uuid
```

state에는 blob 안 넣는다.

---

## 21. multi board 지원

RootState

```
boards
```

여러 개 가능

저장도 board 단위

---

## 22. load 흐름

```
app start
 → load board list
 → select board
 → load board data
 → build state
 → render
```

---

## 23. save 흐름

```
command
 → apply
 → dirty
 → debounce
 → persist
```

---

## 24. sync 구조 (v1 설계만)

sync는 옵션

구조

```
local state
+
remote state
+
merge
```

필요

* version
* change id
* timestamp

v1 구현 안 해도 됨

---

## 25. export / import

export

```
state → json
```

import

```
json → state
```

import는 command로 처리

---

## 26. JSON export 구조

```ts
{
  board,
  items,
  ranges,
  overlays,
  assets
}
```

assets는 포함 안 할 수도 있음

옵션

```
includeAssets
```

---

## 27. memory vs storage 분리

memory

빠름

storage

느림

항상

```
state 먼저
storage 나중
```

---

## 28. view model은 state에 저장 안 함

렌더용 계산값

* cell layout
* range projection
* overlay projection

state에 넣지 않는다.

---

## 29. runtime state

runtime만

```
selection
hover
drag
mode
panel
zoom
scroll
```

persist 안 함

---

## 30. 최소 구현 세트

필수

* RootState
* BoardState
* normalized entities
* IndexedDB
* autosave
* dirty flag
* export json
* import json

선택

* command log
* undo
* sync
* version
* migration

---

## 31. 최종 원칙

* local-first
* command → apply → persist
* board 단위 저장
* entities 정규화
* runtime state 분리
* autosave 기본
* storage는 IndexedDB
* export/import 가능
* sync 확장 가능
* undo 확장 가능

```
