# Range 표시 규격 v1 — Linear Year Planner / Canvas Calendar

## 1. 목적

range는 이 앱의 핵심 단위다.

day만 표시하는 캘린더가 아니라
**기간 자체를 데이터 단위로 다루는 보드**이므로
range는 모든 줌 단계에서 의미 있게 보여야 한다.

range는 다음을 표현한다.

* 기간 메모
* 프로젝트 기간
* 시험 기간
* 여행 기간
* 강조 구간
* 사용자가 선택한 범위
* month 수준 메모
* 반복 구간

range는 day 위에 얹는 decoration이 아니라
**보드의 기본 레이어 중 하나**다.

---

## 2. range 기본 개념

range는 다음으로 정의한다.

```
startDate
endDate
optional label
optional status
optional color
optional progress
```

range는 day에 종속되지 않는다.

* day는 range에 포함될 수 있음
* day 없이 range만 존재 가능
* 여러 range가 같은 day를 포함 가능

---

## 3. range 레이어 위치

레이어 우선순위

```
base
range
day content
selection
overlay/sticker
```

즉

* range는 셀 내용 아래
* range는 선택보다 아래
* overlay보다 아래

range는 텍스트를 가리면 안 된다.

---

## 4. range 시각 표시 방식

초기 v1에서는 단순한 표시만 사용한다.

허용 방식

* left band
* bottom band
* thin background tint

금지

* 전체 배경 채우기
* 강한 색 채우기
* 텍스트 가림

권장 기본

```
left band + optional label
```

이유

* 여러 range 겹침 대응 쉬움
* 가독성 유지 가능
* 줌 대응 쉬움

---

## 5. range 기본 스타일

range는 색으로 구분한다.

각 range는 다음 속성을 가질 수 있다.

```
color
style
label
status
```

초기 v1에서 style 종류는 제한한다.

허용

* normal
* muted
* highlight

설명

normal
일반 range

muted
보조 range

highlight
강조 range

---

## 6. range 겹침 규칙

여러 range가 같은 날짜를 포함할 수 있다.

겹침 허용

예

* 프로젝트
* 시험기간
* 여행준비

겹침 표시 규칙

* 최대 3개 band까지 표시
* 초과 시 overflow 처리

표시 순서

```
highlight
normal
muted
```

또는

```
최근 생성 > 오래된 것
```

초기 권장

```
highlight > normal > muted
```

---

## 7. band 배치 규칙

여러 range가 있을 때

왼쪽부터 쌓는다.

예

```
|A|B|C| cell
```

폭 규칙

* band width 고정
* 줌에 따라 px 유지
* 비율 확대 금지

권장

* 3px ~ 6px 범위

---

## 8. bottom band 규칙

optional

특정 스타일에서만 사용

예

* progress range
* timeline range

규칙

* 얇은 선
* 셀 하단에 위치

```
[ cell ]
------
```

left band와 동시에 사용 가능

---

## 9. background tint 규칙

기본 금지
단 예외 허용

조건

* Z0
* Z1

목적

* 연간 흐름 파악

규칙

* 매우 약한 tint
* 텍스트 가독성 유지

Z2 이상에서는 tint 최소화

---

## 10. range label 표시 규칙

range는 label을 가질 수 있다.

예

* 시험
* 프로젝트
* 여행

label 표시 조건

### Z0

표시 안 함

### Z1

표시 안 함

### Z2

짧은 label 허용 (선택)

### Z3

label 허용

### Z4

label 허용

표시 위치

* 첫 날짜 셀
* 또는 range 시작 위치

초기 v1

range 시작 셀에만 표시

---

## 11. label 길이 제한

Z2

* 4~6자

Z3

* 8~10자

Z4

* 12자 정도

ellipsis 사용

---

## 12. range 선택 규칙

range는 선택 가능해야 한다.

선택 방식

* drag
* click
* long press

선택 표시

* outline
* stronger band
* tint

선택 우선순위

```
selection > range > day
```

즉 선택되면 band보다 강조됨

---

## 13. range 생성 방식

필수 생성 방식

* 날짜 drag
* 메뉴 → create range

선택적

* 패널에서 생성

drag 규칙

```
mousedown
drag
mouseup
= range
```

모바일

```
long press
drag
release
```

---

## 14. range 수정 규칙

허용

* 이동
* 길이 변경
* 색 변경
* label 변경
* 상태 변경

초기 v1

셀 내부에서 직접 수정 안 함

패널에서 수정

---

## 15. range 상태 표시

range도 상태를 가질 수 있다.

예

* active
* done
* delayed

표현

* 색 변화
* opacity 변화

예

done → desaturate

delayed → warning color

초기 v1

optional

---

## 16. range progress

range도 progress 가질 수 있다.

예

프로젝트

표시 방법

* bottom progress bar
* 또는 band 색 변화

초기 v1

미지원 가능

권장

v2 이후

---

## 17. month note 처리

month note는 range로 처리한다.

예

3월 메모

```
Mar 1 ~ Mar 31
```

별도 엔티티 만들지 않는다.

---

## 18. week 표시 규칙

week는 저장하지 않는다.

필요 시 UI로만 표시

가능

* grid line
* subtle line

range와 별도

---

## 19. zoom 단계별 range 표시

### Z0

* strong band
* tint 허용
* label 없음

### Z1

* band 유지
* tint 약하게
* label 없음

### Z2

* band
* label 선택
* tint 최소

### Z3

* band
* label 허용

### Z4

* band
* label 허용

range는 모든 단계에서 유지

---

## 20. overlay와 range 관계

overlay는 range 위

```
range
day
selection
overlay
```

이유

overlay는 자유 객체

range는 구조 레이어

---

## 21. 구현용 range view model

```
type RangeMarker = {
  id: string
  startDate: string
  endDate: string

  color: string

  style: 'normal' | 'muted' | 'highlight'

  label?: string

  status?: string

  layerIndex: number
}
```

셀 렌더링 입력

```
rangeMarkers: RangeMarker[]
```

---

## 22. 최종 원칙

* range는 모든 줌에서 보인다
* band 방식 기본
* 최대 3개 표시
* label은 Z2 이상
* tint는 Z1 이하만
* month note = range
* week는 UI만
* overlay는 range 위

---

