# 엔티티 최소셋 v1 수정본 — Linear Year Planner / Canvas Calendar

## 1. 목적

초기 엔티티는 많으면 안 된다.
지금 단계 목표는 **표현력은 유지하면서 엔티티 수를 최소화**하는 것이다.

즉 다음을 해결해야 한다.

* day / range / overlay / backlog 표현 가능
* 날짜 있는 항목 / 날짜 없는 항목 모두 처리 가능
* month note 별도 엔티티 없이 처리 가능
* future AI / command 구조와 잘 맞아야 함
* 패널 설계 전에 데이터 구조를 안정화해야 함

---

## 2. 결론

초기 최소 엔티티는 **5개**로 간다.

1. `board`
2. `item`
3. `range`
4. `overlay`
5. `asset`

이걸로 충분하다.

---

## 3. 왜 이렇게 줄이냐

기존 후보는 이랬다.

* day
* range
* event
* task
* note
* backlog item
* overlay
* sticker

이걸 그대로 가면 초반부터 분기가 너무 많아진다.

예를 들어

* task / event / note 경계
* backlog 와 no-date task 경계
* sticker 와 image sticker 경계
* month note 와 range note 경계
* day 엔티티 필요 여부

이런 게 전부 복잡도를 올린다.

그래서 초기에는
**“날짜에 붙는 것들”을 item으로 통합**하는 게 맞다.

---

## 4. 엔티티 정의

## 4.1 board

의미:

* 연간 보드 하나의 루트 단위

역할:

* 연도
* 사용자 설정
* 줌/뷰 기본값
* 주 시작 요일
* 기본 표시 옵션

필수 이유:

* 모든 데이터의 소속 루트가 필요함
* export / import / sync 기준 단위가 필요함

---

## 4.2 item

의미:

* 날짜 기반 또는 날짜 없는 일반 항목의 통합 엔티티

이 엔티티 하나로 처리하는 것

* task
* note
* event 성격 항목
* backlog item
* no-date task
* no-date note
* day summary source

즉 초기에는 task / note / event 성격 항목을 별도 엔티티로 쪼개지 않는다.

대신 `item.kind` 로 구분한다.

예:

* `task`
* `note`
* `event`

그리고 backlog/no-date는
별도 타입이 아니라 **날짜/범위 연결이 없는 item** 으로 처리한다.

---

## 4.3 range

의미:

* 기간 자체를 나타내는 독립 엔티티

이 엔티티가 필요한 이유:

* day 여러 개를 묶는 메모/강조/기간 표현이 핵심 기능이기 때문
* month note도 range로 처리 가능하기 때문
* range는 item에 종속되면 안 되기 때문

range로 처리하는 것

* 기간 메모
* 프로젝트 구간
* 시험 기간
* 여행 기간
* month note
* 기간 강조

---

## 4.4 overlay

의미:

* 보드 좌표계 위 자유 시각 객체

이 엔티티 하나로 처리하는 것

* sticker
* image
* text label
* shape

즉 sticker는 overlay subtype 이다.

---

## 4.5 asset

의미:

* overlay/image 등에 연결되는 파일 리소스

필요 이유:

* 이미지 파일을 overlay와 분리해야 함
* storage / cache / sync 처리 분리가 필요함
* builtin / user 업로드 / external 을 같은 구조로 다루기 쉬움

asset은 UI 엔티티라기보다 저장/참조 엔티티다.

---

## 5. day 엔티티를 두지 않는 이유

초기에는 `day` 엔티티를 따로 두지 않는다.

이유:

* 모든 날짜는 캘린더 계산으로 생성 가능
* 비어 있는 날짜를 굳이 저장할 필요 없음
* 셀 렌더링은 `date + item/range aggregation` 으로 가능
* 저장량과 구조 복잡도를 줄일 수 있음

즉 날짜 셀은 저장 객체가 아니라
**렌더링 시 계산되는 view unit** 이다.

---

## 6. task / note / event 를 분리하지 않는 이유

초기에는 분리 안 한다.

이유:

* 셀 렌더링은 어차피 summary 중심
* 패널도 공통 필드가 많음
* status / progress / title / body 같은 공통 필드가 큼
* command 구조를 단순하게 만들 수 있음

즉 초기에는

```txt
item.kind = task | note | event
```

이렇게만 둔다.

다만 여기서 `event`는 별도 강한 도메인 분리가 아니라
**표시/분류용 kind** 정도로 취급한다.

---

## 7. backlog 를 별도 엔티티로 두지 않는 이유

backlog는 별도 엔티티가 아니다.

backlog의 본질은
**날짜/범위에 아직 할당되지 않은 item 집합** 이다.

즉 backlog 조건은 예를 들면 이렇게 보면 된다.

```txt
item.date 없음
item.rangeId 없음
item.archived 아님
item.status != done
```

따라서 backlog는 저장 엔티티가 아니라
**query / filter 결과** 로 보는 게 맞다.

---

## 8. no-date task / no-date note 처리

이것도 별도 엔티티 없다.

둘 다 그냥 item이다.

차이는

* kind
* date 연결 유무
* range 연결 유무

로만 구분한다.

예:

* 날짜 없음 + range 없음 + kind=task → no-date task
* 날짜 없음 + range 없음 + kind=note → no-date note

---

## 9. month note 처리

month note도 별도 엔티티 두지 않는다.

이건 range로 처리한다.

예:

* 2026-03-01 ~ 2026-03-31
* label = "March note"

이렇게.

즉
**month note = month 범위의 range**

---

## 10. range note 별도 엔티티 필요 여부

별도 엔티티 두지 않는다.

range 자체가 이미

* label
* body
* status
* color

를 가질 수 있으므로
period note 기능을 수행할 수 있다.

즉

* range task 성격
* range memo 성격
* range highlight 성격

을 굳이 다른 엔티티로 쪼개지 않는다.

초기에는 `range.kind` 를 두는 정도면 충분하다.

---

## 11. 최소 엔티티 구조 요약

## 11.1 board

보드 자체

## 11.2 item

날짜 있는/없는 일반 항목

## 11.3 range

기간 단위 데이터

## 11.4 overlay

시각 자유 객체

## 11.5 asset

파일/이미지 리소스

---

## 12. 관계 구조

대략 이런 관계다.

```txt
board
 ├─ items[]
 ├─ ranges[]
 ├─ overlays[]
 └─ assets[]
```

item 은 날짜 또는 range와 연결될 수 있다.
둘 다 없을 수도 있다.
둘 다 동시에 가질 수도 있다.

range 는 독립 존재 가능하다.

overlay 는 asset 을 참조할 수 있다.

---

## 13. item 상세 방향

초기 item 필수 속성 방향

```ts
type ItemKind = 'task' | 'note' | 'event'

type ItemEntity = {
  id: string
  boardId: string

  kind: ItemKind

  title?: string
  body?: string

  date?: string
  rangeId?: string

  status?: 'none' | 'in-progress' | 'done' | 'delayed' | 'important'
  progress?: number

  pinned?: boolean

  createdAt: string
  updatedAt: string
}
```

핵심 원칙

* `date` 와 `rangeId` 는 모두 optional
* 둘 다 없을 수 있음
* 둘 다 동시에 가질 수 있음

의미:

* `date`만 있음 → 특정 날짜 중심 item
* `rangeId`만 있음 → 특정 기간에 속한 item
* 둘 다 있음 → 특정 range에 속하면서 대표 날짜도 가진 item
* 둘 다 없음 → backlog / no-date item

---

## 14. item 연결 규칙

초기 규칙은 이렇게 잡는다.

```txt
item.date optional
item.rangeId optional
date + rangeId 동시 허용
```

이유:

* 기간 안에 속하지만 특정 날짜도 가진 항목을 표현 가능
* 장기적으로 더 확장 친화적
* command / UI 표현을 더 자연스럽게 만들 수 있음

예:

* 시험기간 range 안에 속한 “3월 18일 제출” task
* 프로젝트 range 안에 속한 “킥오프 미팅” event
* 여행 range 안에 속한 “출발일 체크리스트” item

---

## 15. range 상세 방향

```ts
type RangeKind = 'period' | 'note' | 'highlight'

type RangeEntity = {
  id: string
  boardId: string

  kind: RangeKind

  startDate: string
  endDate: string

  label?: string
  body?: string

  status?: 'none' | 'active' | 'done' | 'delayed'
  color?: string

  createdAt: string
  updatedAt: string
}
```

핵심 원칙

* month note 가능
* 일반 기간 메모 가능
* 강조 구간 가능

---

## 16. overlay 상세 방향

```ts
type OverlayType = 'sticker' | 'text' | 'shape' | 'image'
type OverlayRole = 'semantic' | 'decorative'

type OverlayEntity = {
  id: string
  boardId: string

  type: OverlayType
  role: OverlayRole

  x: number
  y: number
  width: number
  height: number

  opacity?: number
  locked: boolean

  anchorType?: 'none' | 'month'
  anchorId?: string

  text?: string
  assetId?: string

  createdAt: string
  updatedAt: string
}
```

---

## 17. asset 상세 방향

```ts
type AssetType = 'image'
type AssetSourceType = 'builtin' | 'user' | 'external'

type AssetEntity = {
  id: string
  boardId: string

  type: AssetType
  sourceType: AssetSourceType

  mimeType?: string
  storageKey: string

  width?: number
  height?: number

  createdAt: string
  updatedAt: string
}
```

---

## 18. 초기 의도적으로 빼는 것

초기 최소셋에서는 아직 넣지 않는다.

* recurrence 별도 엔티티
* tag 엔티티
* checklist item 별도 엔티티
* comment 엔티티
* reminder 엔티티
* relation 엔티티
* week 엔티티
* month 엔티티
* day 엔티티
* undo log 엔티티
* sync conflict 엔티티

이건 나중에 확장 가능하다.

---

## 19. 핵심 판단

이 단계에서 가장 중요한 결정은 이것이다.

### 1. day 엔티티 없음

렌더링 계산으로 처리

### 2. task / note / event 통합

`item.kind` 로 구분

### 3. backlog 별도 엔티티 없음

query 결과로 처리

### 4. month note 별도 엔티티 없음

range로 처리

### 5. sticker 별도 엔티티 없음

overlay 구조로 처리

### 6. item 은 date 와 rangeId 동시 허용

장기 확장성과 표현력 확보

---

## 20. 최종 확정안

초기 최소 엔티티는 아래 5개로 간다.

```txt
board
item
range
overlay
asset
```

이 구성이면

* 연간 보드
* 날짜 셀
* 날짜 없는 항목
* 기간 메모
* month note
* overlay/sticker
* 업로드 이미지
* export/import 확장

전부 커버 가능하다.

---

## 21. 다음 단계

다음은 이 최소 엔티티 기준으로
**command 구조 v1** 을 잡아야 한다.
