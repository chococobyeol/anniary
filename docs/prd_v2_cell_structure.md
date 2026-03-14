# Cell Layout Spec v1 — Linear Year Planner / Canvas Calendar

## 1. 목적

날짜 셀은 단순 날짜 표시 칸이 아니라 다음 정보를 압축해서 보여주는 기본 단위다.

- 날짜 식별
- 상태 요약
- 진행률 요약
- 당일 항목 요약

셀은 상세 편집 UI가 아니라 **요약 카드**이며,  
복잡한 편집은 패널에서 처리한다.

---

## 2. 셀 레이어 구조

셀은 내부적으로 다음 레이어로 나눈다.

1. base layer  
   - 배경  
   - hover / press  
   - 선택 상태

2. range layer  
   - range 표시  
   - 셀 내용 아래에 위치

3. content layer  
   - date  
   - status  
   - progress  
   - summary

4. interaction layer  
   - 클릭 / 탭 / 선택 처리

우선순위

```

base < range < content < selection

```

overlay / sticker 는 셀 내부가 아니라 보드 레이어에 존재한다.

---

## 3. 셀 내부 영역 분할

셀은 세로 3구역으로 나눈다.

```

header
body
footer

````

### header
- 날짜
- 상태 마커
- 작은 아이콘

### body
- progress
- summary

### footer
- overflow 요약

---

## 4. 표시 우선순위

셀에서 표시되는 정보 우선순위

1. date
2. selection
3. status
4. progress
5. pinned item
6. item summary
7. overflow

---

## 5. summary 우선순위

여러 항목이 있을 경우 표시 순서

1. pinned item
2. in-progress task
3. event
4. task
5. note
6. done item

완료 항목은 뒤로 밀린다.

---

## 6. 셀 뷰 데이터 모델

셀은 직접 event/task/note를 렌더링하지 않고  
요약 리스트만 렌더링한다.

```ts
type DayCellViewModel = {
  dateKey: string
  dayNumber: number

  primaryStatus: string
  progressPercent?: number

  summaryLines: Summary[]

  hiddenCount: number

  rangeMarkers: RangeMarker[]
}
````

---

## 7. header 규격

### 날짜

* 항상 표시
* 좌상단 고정

예

```
1
14
```

월 첫날만 month hint 허용

```
Mar 1
```

### 상태 마커

* 1개만 표시
* 작은 dot / bar / badge

### 아이콘

* 최대 1개

---

## 8. body 규격

### progress

* 날짜 아래 표시
* 얇은 가로 bar

대표 progress 선택 규칙

1. pinned item
2. in-progress task
3. 없음

### summary

* 한 줄당 하나
* 길이 제한
* 줄 수 제한

예

```
회의 준비
병원
초안 제출
+2
```

---

## 9. footer 규격

정보가 넘칠 때만 사용

예

```
+2
+5
```

---

## 10. 줌 단계별 표시 규칙

### Z0

* date
* status
* range
* summary 없음

### Z1

* date
* status
* progress 최소
* summary 0~1

### Z2

* date
* status
* progress
* summary 1

### Z3

* date
* status
* progress
* summary 2

### Z4

* date
* status
* progress
* summary 3+

---

## 11. 줄 수 규칙

```
Z0 0
Z1 0~1
Z2 1
Z3 2
Z4 3
```

4줄 이상 금지

---

## 12. 체크리스트 표시

셀에서는 전체 표시하지 않는다

가능

```
2/5
3 done
```

Z3 이상에서만 표시

---

## 13. 상태 종류

초기 상태

* none
* in-progress
* done
* delayed
* important

표시는 1개만

우선순위

```
delayed > important > in-progress > done > none
```

---

## 14. range 표시 규칙

range는 셀 내용을 가리면 안 된다

허용

* left band
* bottom band

금지

* full background

---

## 15. 타입 혼합 규칙

셀은 타입별 블록을 만들지 않는다

summary 리스트만 사용

예

```
회의
마감
메모
+2
```

---

## 16. 선택 상태

우선순위

```
normal
hover
selected
active
```

### selected

* outline

### active

* stronger outline

---

## 17. hover / press

hover

* 약한 tint

press

* 더 강한 tint

모바일

* hover 없음

---

## 18. 셀 내부 허용 액션

허용

* select
* double click create
* quick toggle
* quick check

금지

* 긴 편집
* 복잡 입력

---

## 19. 시각 원칙

금지

* 강한 배경색
* 텍스트 과밀
* 아이콘 나열

유지

* 요약 중심
* 상세는 패널

---

## 20. 최종 원칙

셀은

```
header(date/status)
body(progress/summary)
footer(overflow)
```

구조를 사용한다.

range는 셀 아래 레이어
overlay/sticker는 보드 레이어

셀은 요약 카드로 유지한다.

```
