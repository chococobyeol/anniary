# 연간 보드 기간 막대 (Timeline bars)

연일정(기간)은 `RangeEntity`와 연결되며, **연간 보드 각 월 행 하단**에 가로 막대(SVG)로 표시됩니다. 레이아웃은 `src/utils/monthGantt.ts`의 `layoutMonthGanttSegments`가 담당합니다.

## 데이터 모델 (`RangeEntity`)

| 필드 | 타입 | 기본(미설정 시) | 설명 |
|------|------|-----------------|------|
| `timelineBarHidden` | `boolean` (optional) | `false` | `true`이면 **막대만** 그리지 않음. 아이템·백로그·디테일·날짜 인덱스는 그대로. |
| `timelinePriority` | `number` (optional) | `0` | **표시 순서(Display order)**. **날짜 셀**에서 해당 기간에 묶인 일정 줄이 **큰 값일수록 위에** 보이고, 같은 달에서 막대가 겹칠 때도 **더 위쪽 트랙**에 옴. 허용 범위: **-50 ~ 50** (UI·저장 시 클램프). |

- 기존 저장 데이터에 필드가 없으면 막대 표시 + 표시 순서 0으로 동작합니다.
- `createRange` 옵션으로 생성 시에도 동일 필드를 넘길 수 있습니다 (`board-store.ts`).

## 동작 요약

1. **숨김**  
   `timelineBarHidden === true` 인 범위는 간트 raw 목록에 넣지 않아 **화면에 막대가 없습니다.**

2. **표시 순서 (막대)**  
   막대 후보를 모은 뒤 `timelinePriority` **오름차순** → 시작일 → 종료일 → `rangeId`로 정렬하여 트랙에 배치합니다. 낮은 값이 먼저 하단 트랙을 차지하고, **큰 값은 위쪽 트랙**에 배치됩니다. 트랙 수 상한(`MAX_TRACKS`)은 `monthGantt.ts`에 정의되어 있어, 매우 많이 겹치면 하단 트랙에 쌓일 수 있습니다.

2b. **표시 순서 (날짜 셀 요약)**  
   `MonthRow`에서 하루에 여러 아이템이 있을 때, **고정(pin)** 이 먼저이고, 그다음 **연결된 기간의** `timelinePriority` **내림차순**(큰 값이 위), 그다음 **in-progress** 우선입니다. `rangeEditPreview`가 해당 `rangeId`를 가리키면 미리보기 값으로 정렬합니다 (`linkedRangeTimelinePriority`, `src/utils/itemTimelinePriority.ts`).

3. **디테일 편집 미리보기**  
   저장 전에는 `AppState.rangeEditPreview`에 색·Kind·숨김·표시 순서를 반영해 보드에만 임시 적용합니다. **Save** 시 스토어에 반영되고, **Cancel** 시 스토어 기준으로 되돌아갑니다. (`setRangeEditPreview`는 `dirty`를 바꾸지 않습니다.)

## UI에서 설정하는 위치

- **아이템 디테일** (`DetailPanel` → `ItemDetail`): 시작일·기간 종료일이 유효할 때 **Period color**, **Period bar** (Hide period bar on year board), **Display order** 표시. 기존 `rangeId`가 없으면 첫 저장 시 `createRange`에 함께 기록됩니다.
- **범위 디테일** (`DetailPanel` → `RangeDetail`): 동일 옵션을 draft로 편집 후 **Save / Cancel**.
- 각 항목 옆 **정보 아이콘**(벡터 `IconInfo`, 다른 패널 아이콘과 동일 stroke)에 마우스를 올리거나 포커스하면 **즉시 뜨는 말풍선**으로 영어 설명이 표시됩니다. (브라우저 기본 `title`·`cursor: help`는 macOS에서 물음표 커서만 보이거나 늦게 떠서 사용하지 않음.) 체크 행·숫자 입력·색 스와치에는 보조로 `title`이 붙어 있습니다.

## 관련 소스 파일

- `src/types/entities.ts` — `RangeEntity`
- `src/types/state.ts` — `RangeEditPreview`
- `src/store/board-store.ts` — `createRange`, `updateRange`
- `src/utils/monthGantt.ts` — 필터·정렬·트랙 배치
- `src/components/board/MonthRow.tsx` — 셀 VM(요약 줄 순서) + 막대 SVG 렌더
- `src/utils/itemTimelinePriority.ts` — 아이템→기간 표시 순서(셀 정렬·미리보기)
- `src/components/panels/DetailPanel.tsx` — 폼·미리보기 동기화

## 제한 사항 (알려둘 점)

- 막대 숨김(`timelineBarHidden`)은 **연간 보드의 기간 막대**에만 적용됩니다. 날짜 셀 안 아이템 텍스트는 그대로 표시됩니다.
- 표시 순서는 **같은 날짜 셀 안** 줄 순서와 **같은 월 행 안** 막대 트랙 경쟁에 쓰입니다. 기간에 연결되지 않은 아이템은 표시 순서 0으로 취급합니다.
