# Overlay / Sticker Spec v1 — Linear Year Planner / Canvas Calendar

## 1. 목적

overlay / sticker 는 단순 장식이 아니라  
연간 보드에서 시각 흐름을 빠르게 파악하기 위한 독립 레이어다.

역할

- 기간/영역 강조
- 시각 신호 제공
- 보드 구획 표현
- 꾸미기 요소
- PNG export 시 실제 모습 유지

overlay / sticker 는 day / range 와 별도로 존재하는  
자유 배치 시각 객체다.

---

## 2. 기본 원칙

- 기본은 free-position
- 보드 좌표계 기준
- day/range 와 자동 결합하지 않음
- 줌 단계에 따라 표현 변화
- 셀 가독성 방해 금지
- 상세 편집은 패널
- 이동 / 크기 / 잠금 가능

---

## 3. 용어 구조

overlay 는 모든 시각 객체의 상위 개념이다.

```

overlay
├─ sticker
├─ text
├─ shape
└─ image

```

여기서

- 기본 제공 이미지
- 사용자 업로드 이미지

둘 다 동일한 image 타입이다.

타입 분리하지 않는다.

차이는 asset source 로만 구분한다.

---

## 4. overlay 타입

초기 v1 허용 타입

- sticker
- text
- shape
- image

설명

sticker  
기본 제공 장식 객체

text  
짧은 문구

shape  
도형 / 강조 영역

image  
이미지 기반 객체

image 타입에는

- builtin sticker
- user upload
- external image

모두 포함된다.

---

## 5. 좌표계

overlay 는 board coordinate 기준

```

x
y
width
height
rotation?

```

원칙

- zoom → 좌표 유지
- pan → 뷰 이동만
- overlay 위치 고정
- screen 좌표 사용 금지

---

## 6. anchor

기본

```

none
month
day
range

```

초기 v1 권장

- none
- month

anchor 는 optional

기본 생성은 none

---

## 7. 레이어 순서

```

base
range
day
selection
overlay
overlay handles

```

overlay 는 day 위

---

## 8. 표시 원칙

Z0 ~ Z1

- 강하게 보임

Z2

- 보이되 방해 금지

Z3

- 축소

Z4

- 약화 / 단순화

overlay 는 줌 비율 그대로 확대하지 않는다.

---

## 9. semantic / decorative

overlay.role

```

semantic
decorative

```

semantic

- 의미 전달

decorative

- 꾸미기

줌 규칙

semantic → 유지

decorative → Z3 이후 약화 가능

---

## 10. 크기 규칙

- 최소 크기 있음
- 최대 크기 있음
- 기본 preset 있음

zoom 에 따라 실제 데이터 크기 변경 안함

표현만 보정 가능

---

## 11. 이동 규칙

drag 이동

```

overlay selected + drag = move
empty drag = pan

```

모바일

tap → select  
drag → move

---

## 12. 선택

click / tap / long press

선택 시

- outline
- bounding box
- resize handle

초기 v1

rotate 제외 가능

---

## 13. 핸들

선택 시만 표시

허용

- resize
- move
- lock
- delete

보류

- rotate
- skew

---

## 14. lock

lock = 이동 금지

허용

- 선택
- 삭제(확인 후)

필수 기능

---

## 15. opacity

overlay.opacity

preset 권장

```

100
80
60
40

```

슬라이더는 패널

---

## 16. text 규칙

text 는 짧게

허용

- 1~2줄

금지

- 긴 문장
- note 대체

---

## 17. image 규격

image 는 하나의 타입

구분하지 않음

- builtin
- user
- external

차이는 source 로만

예

```

imageSourceType
assetId

```

제한

- max size
- format
- resize
- ratio 유지

권장

PNG / WebP

큰 이미지 업로드 시 축소

---

## 18. 충돌 규칙

```

empty drag = pan
selected overlay drag = move
tap = select
long press = menu

````

overlay 가 셀 선택 막으면 안됨

모바일

select → move

2단계 방식

---

## 19. context menu

허용

- edit
- duplicate
- lock
- delete

v2

- z-index

---

## 20. z-index

초기

- 생성 순서
- 선택 시 강조

수동 조절 없음

---

## 21. 패널 편집

패널에서 수정

- type
- role
- x y
- size
- opacity
- lock
- anchor
- text
- asset

보드에서 직접 복잡 편집 금지

---

## 22. export

PNG 포함

JSON 포함

ICS 제외

overlay 는 시각 레이어

---

## 23. 삭제

- 단일
- 선택 삭제
- lock 시 확인

undo 권장

---

## 24. 데이터 모델

```ts
type OverlayType = 'sticker' | 'text' | 'shape' | 'image'

type OverlayRole = 'semantic' | 'decorative'

type OverlayAnchorType = 'none' | 'month' | 'day' | 'range'

type ImageSourceType = 'builtin' | 'user' | 'external'

type OverlayEntity = {
  id: string

  type: OverlayType
  role: OverlayRole

  x: number
  y: number

  width: number
  height: number

  rotation?: number

  opacity?: number

  locked: boolean

  anchorType: OverlayAnchorType
  anchorId?: string

  text?: string

  assetId?: string
  imageSourceType?: ImageSourceType

  createdAt: string
  updatedAt: string
}
````

---

## 25. 줌 규칙

Z0

* 강함

Z1

* 유지

Z2

* 방해 금지

Z3

* 축소

Z4

* decorative 약화

---

## 26. 최종 원칙

* overlay 는 자유 객체
* image 는 하나의 타입
* source 만 구분
* free-position 기본
* lock 필수
* 선택 후 이동
* panel 편집
* export 포함
* zoom 단계별 표현 변화

```

