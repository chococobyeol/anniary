# Anniary 기술 스택 결정

## 최종 선택

| 구분 | 기술 | 비고 |
|------|------|------|
| Frontend | React + TypeScript | 컴포넌트, 상태, 이벤트, 스타일링 |
| 보드 렌더링 | SVG + CSS transforms | Konva/Pixi 미사용 |
| 상태 관리 | Command-based local state | PRD 15절 아키텍처와 일치 |
| 모바일 패키징 | Capacitor | 웹 앱을 iOS/Android로 감싸기 |

---

## 선택 근거

> AI 관련 주장(학습 데이터 비중, 패턴 정형화, 디버깅 용이성)은 실험/연구로 검증된 사실이 아니라 추론·경험에 따른 판단이다.

### 1. React + TypeScript
- 컴포넌트, 상태, 이벤트, 리스트, 스타일링 등 일반 UI 패턴 문서·예제가 풍부함
- "컴포넌트로 UI를 만들고, 이벤트에 반응하고, 상태를 갱신한다"는 기본 흐름이 명확함
- 이 패턴은 AI가 가장 안정적으로 생성·수정·리팩터링하는 영역

### 2. SVG + CSS (Canvas/Konva/Pixi 미사용)
- Konva: 캔버스 기반, 좌표계·hit test·transform·이벤트 충돌·객체 관리 등 복잡도 증가
- PixiJS: WebGL 렌더러, 게임/그래픽 툴에 적합, 생산성 앱에는 과함
- Anniary 핵심은 그래픽 엔진이 아니라 **에디터형 보드 UI** (패널, 검색, backlog, 필터, 상세, 선택, autosave)
- SVG + CSS는 AI가 다루기 가장 안정적이고, PRD의 줌/팬/range/오버레이 표현에 충분

### 3. Capacitor
- 웹 앱을 iOS/Android 네이티브 앱 컨테이너로 감싸는 공식 경로 제공
- 웹 우선 개발 후 나중에 앱 패키징하는 전략과 부합
- PRD 5.1 모바일 조작 가능성, 7절 모바일 UX 원칙과 일치

### 4. React Native 미선택
- 웹 컴포넌트가 아닌 네이티브 컴포넌트 사용
- 플랫폼 차이, 환경 설정, 네이티브 모듈 등 추가 복잡도
- 웹 React 대비 AI 기반 완성 앱까지의 성공 확률이 낮음

---

## v1 고정 기준

- v1에서는 Konva/Pixi 사용하지 않음
- 보드는 SVG 기반으로 구현
- 패널/툴바/상태 관리는 전부 React로 처리
- 안드로이드는 Capacitor로 감쌈
- 성능 한계가 실제로 확인되기 전까지 렌더 엔진 교체를 고려하지 않음

---

## PRD 연계

| 스택 | PRD 섹션 |
|------|----------|
| React + TypeScript | 패널, 검색, 필터, 상세 편집 등 에디터형 UI |
| SVG + CSS | 연간 보드, 줌/팬, range, 오버레이 |
| Command-based state | 15절 `UI → command → state → storage/sync` |
| Capacitor | 5.1 모바일 조작, 7절 모바일 UX |
