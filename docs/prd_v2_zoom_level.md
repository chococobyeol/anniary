# 줌 단계별 셀 표시 규격 v1

## 1. 목적

줌은 단순 확대/축소가 아니라 **정보 밀도 전환 규칙**이다.

즉 줌 단계가 바뀌면 다음이 함께 바뀐다.

* 셀 크기
* 표시 정보 양
* 텍스트 줄 수
* progress 표시 강도
* range 표시 강도
* overlay/sticker 존재감

---

## 2. 줌 단계 수 확정

초기 v1은 **5단계**로 간다.

* Z0 — 연간 전체 요약
* Z1 — 상태 요약
* Z2 — 기본 실사용
* Z3 — 상세 요약
* Z4 — 초상세

연속 줌은 허용하되,
실제 렌더링 규칙은 위 5단계 중 하나에 매핑한다.

즉 내부적으로는 연속 스케일이어도 UI 규칙은 단계형이다.

---

## 3. 단계 전환 기준

초기 기준은 **셀의 화면상 폭(width)** 기준으로 잡는다.

### 권장 기준

* Z0: `< 28px`
* Z1: `28px ~ 47px`
* Z2: `48px ~ 79px`
* Z3: `80px ~ 127px`
* Z4: `128px+`

높이가 아니라 폭 기준으로 통일하는 것이 좋다.
레이아웃 판단이 단순해지고, 텍스트 표시 규칙도 맞추기 쉽다.

---

## 4. 각 단계의 역할

### Z0 — 연간 전체 요약

목적:

* 연간 밀도 파악
* 바쁜 구간 / 빈 구간 파악
* range 분포 파악
* sticker / overlay 위치 파악

이 단계에서는 읽기보다 **분포 인식**이 우선이다.

### Z1 — 상태 요약

목적:

* 날짜별 상태 대략 파악
* 일부 요약 텍스트 노출 시작
* progress 존재 여부 확인

### Z2 — 기본 실사용

목적:

* 날짜별 핵심 내용 확인
* 셀 단위로 실제 사용 가능
* summary 1줄 읽기 가능

이 단계가 기본 줌 기준이 된다.

### Z3 — 상세 요약

목적:

* 패널 열기 전에도 날짜 내용을 꽤 읽을 수 있음
* 체크/진행/요약을 함께 볼 수 있음

### Z4 — 초상세

목적:

* 셀 자체가 거의 카드처럼 보임
* 읽기 중심
* 빠른 확인/선택/간단 액션 최적화

여전히 상세 편집기는 아니고,
정식 편집은 패널에서 한다.

---

## 5. 단계별 셀 표시 규격

## Z0

### 표시 항목

* date
* 대표 status marker
* range marker
* 선택 상태
* today 표시
* overlay/sticker 강하게 표시

### 숨김 항목

* summary text
* checklist summary
* hidden count
* 일반 progress bar

### progress 처리

* 기본 숨김
* 필요 시 아주 얇은 존재 표시만 허용

### summary 줄 수

* 0줄

### 핵심 원칙

* 텍스트 읽기보다 패턴 파악 우선

---

## Z1

### 표시 항목

* date
* 대표 status marker
* 최소 progress
* range marker
* summary 최대 1줄
* hidden count 선택적
* today 표시
* 선택 상태

### summary 줄 수

* 0~1줄

### progress

* 높이 매우 얇은 bar
* 수치 텍스트 없음

### 핵심 원칙

* 밀도는 유지하되, 일부 날짜만 읽히기 시작해야 함

---

## Z2

### 표시 항목

* date
* 대표 status marker
* progress bar
* summary 1줄
* hidden count
* range marker
* today 표시
* 선택 상태

### summary 줄 수

* 1줄 고정

### checklist summary

* 기본 숨김

### 핵심 원칙

* “기본 사용 줌”
* 날짜별 핵심 내용을 가장 균형 있게 보여주는 단계

---

## Z3

### 표시 항목

* date
* 대표 status marker
* progress bar
* summary 2줄
* hidden count
* checklist summary 선택적
* range label 일부 허용
* today 표시
* 선택 상태

### summary 줄 수

* 2줄

### checklist summary

* 대표 item이 체크형이면 표시 가능
* 예: `2/5`

### 핵심 원칙

* 읽기 가능성이 확실히 올라가야 함
* 하지만 셀이 편집기처럼 보이면 안 됨

---

## Z4

### 표시 항목

* date
* 대표 status marker
* progress bar
* summary 3줄
* hidden count
* checklist summary
* range label
* today 표시
* 선택 상태
* 필요 시 대표 subtype marker

### summary 줄 수

* 3줄 고정
* 예외적으로 4줄까지 허용 가능하지만 기본은 3줄

### checklist summary

* 허용

### 핵심 원칙

* 상세 읽기 최적화
* 그래도 긴 텍스트 직접 편집은 하지 않음

---

## 6. 단계별 텍스트 표시 규칙

### Z0

* 텍스트 없음

### Z1

* 아주 짧은 1줄
* 강한 ellipsis
* 타입 아이콘 최소 허용

### Z2

* 1줄
* 대표 summary만 표시
* hidden count 적극 사용

### Z3

* 2줄
* 2개 item 또는 1개 긴 item 요약 가능

### Z4

* 3줄
* 3개 item 또는 긴 summary 1~2개 가능

---

## 7. 단계별 progress 규격

### Z0

* 숨김 또는 극소 존재감

### Z1

* 아주 얇은 bar

### Z2

* 표준 얇은 bar

### Z3

* 표준 bar
* 가시성 강화

### Z4

* 표준 bar 유지
* 수치 텍스트는 넣지 않음

초기 v1에서는 퍼센트 숫자를 셀에 직접 쓰지 않는다.
막대만 유지한다.

---

## 8. 단계별 checklist 규격

### Z0

* 숨김

### Z1

* 숨김

### Z2

* 숨김

### Z3

* 대표 item이 체크형이면 요약 허용

예:

* `2/5`

### Z4

* 허용

예:

* `2/5`
* `3 done`

---

## 9. 단계별 hidden count 규격

### Z0

* 숨김

### Z1

* 선택적

### Z2

* 표시

### Z3

* 표시

### Z4

* 표시

형태:

* `+2`
* `+5`

`more` 같은 단어보다 숫자형이 좋다.

---

## 10. 단계별 range 표시 규격

range는 모든 단계에서 보여야 한다.
다만 방식이 달라진다.

### Z0

* 가장 강하게 보여야 함
* 연간 흐름 파악에 중요
* left band / bottom band / tint 중 가독성 높은 방식 사용

### Z1

* 여전히 강하게 유지
* 라벨은 거의 숨김

### Z2

* marker 유지
* 짧은 라벨 제한적으로 허용 가능

### Z3

* marker + 일부 라벨 허용

### Z4

* marker + 라벨 허용

핵심은
**줌이 커질수록 range가 사라지면 안 되지만, day 텍스트를 가리면 안 된다**는 점이다.

---

## 11. 단계별 overlay / sticker 규격

overlay/sticker는 셀 외부 보드 레이어이지만
줌 규격에 포함해서 같이 정해야 한다.

### Z0

* 매우 중요
* 크게 보이거나, 최소한 존재감 있게 보여야 함
* 연간 시각 흐름 파악 핵심

### Z1

* 여전히 분명히 보임

### Z2

* 보이되 셀 summary 가독성 방해 금지

### Z3

* 크기 축소 또는 투명도 완화
* 셀 본문 가림 금지

### Z4

* 더 축소하거나 단순화
* 필요 시 일부 decorative sticker 숨김 허용

즉, overlay/sticker는 화면 비율대로 무조건 같이 커지는 객체가 아니다.
**줌 단계에 따라 존재감이 조절되는 시각 레이어**다.

---

## 12. 단계별 상호작용 규칙

## Z0

허용:

* pan
* select
* 전체 흐름 탐색
* 날짜 클릭

비권장:

* 세밀 조작
* 작은 요소 직접 조작

## Z1

허용:

* 날짜 선택
* 기본 탐색
* 간단 액션 시작

## Z2

허용:

* 기본 선택
* 빠른 생성
* 빠른 상태 변경
* 패널 진입

## Z3

허용:

* 빠른 체크
* 빠른 토글
* 상세 읽기
* 패널 진입

## Z4

허용:

* 읽기 최적화
* 빠른 액션 최적화
* 그래도 복잡 편집은 패널로 보냄

---

## 13. 기본 진입 줌 기준

초기 앱 진입 시 기본 줌은 **Z1 또는 Z2** 중 하나여야 한다.

권장:

* 데스크톱 기본: **Z1**
* 모바일 기본: **Z1**
* 사용자가 약간만 확대하면 Z2 진입

이유:

* 처음 열자마자 한 해 전체가 보여야 함
* 동시에 너무 멀어서 아무 정보도 안 보이면 안 됨

즉 기본은 연간 흐름 중심이 맞다.

---

## 14. 애니메이션/전환 규칙

줌은 연속적으로 움직이되
정보는 단계 경계에서 바뀐다.

원칙:

* 텍스트가 갑자기 튀는 느낌 최소화
* 단계 전환 시 opacity/fade 사용 가능
* layout jump 최소화
* 스티커/overlay 전환도 급격하지 않게 처리

초기 v1 원칙:

* 단계 전환 시 100~150ms 정도의 짧은 시각 보간 허용
* 과한 확대 애니메이션은 금지

---

## 15. 구현용 뷰 규칙 요약

셀 렌더링은 다음 입력으로 결정되면 된다.

```ts
type ZoomLevel = 'Z0' | 'Z1' | 'Z2' | 'Z3' | 'Z4'

type DayCellRenderPolicy = {
  zoomLevel: ZoomLevel
  showSummaryLines: number
  showProgress: boolean
  showChecklistSummary: boolean
  showHiddenCount: boolean
  showRangeLabel: boolean
}
```

권장 매핑:

```ts
const DAY_CELL_POLICY = {
  Z0: {
    showSummaryLines: 0,
    showProgress: false,
    showChecklistSummary: false,
    showHiddenCount: false,
    showRangeLabel: false,
  },
  Z1: {
    showSummaryLines: 1,
    showProgress: true,
    showChecklistSummary: false,
    showHiddenCount: false,
    showRangeLabel: false,
  },
  Z2: {
    showSummaryLines: 1,
    showProgress: true,
    showChecklistSummary: false,
    showHiddenCount: true,
    showRangeLabel: false,
  },
  Z3: {
    showSummaryLines: 2,
    showProgress: true,
    showChecklistSummary: true,
    showHiddenCount: true,
    showRangeLabel: true,
  },
  Z4: {
    showSummaryLines: 3,
    showProgress: true,
    showChecklistSummary: true,
    showHiddenCount: true,
    showRangeLabel: true,
  },
}
```

---

## 16. 최종 확정안 요약

* 줌은 **5단계(Z0~Z4)** 로 간다
* 단계 전환은 **셀 화면상 폭 기준**으로 판단한다
* 기본 사용 단계는 **Z2**
* 기본 진입은 **Z1**
* summary 줄 수는 **0 / 1 / 1 / 2 / 3**
* checklist는 **Z3 이상**
* hidden count는 **Z2 이상**
* range는 **모든 단계에서 유지**
* overlay/sticker는 **Z0~Z1에서 강하고, Z3~Z4에서 존재감 축소**

다음 결정해야 할 것은 **range 표시 규격**이다.
