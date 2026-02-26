# GABOJAGO - AI Travel Assistant

> AI 기반 여행 일정 관리 및 추천 서비스

**GABOJAGO**는 사용자의 취향과 여행 스타일을 분석하여 최적의 여행 코스를 제안하고, 여행 중에도 스마트하게 일정을 관리할 수 있도록 돕는 웹 애플리케이션입니다.

---

## 🚀 Getting Started

프로젝트를 로컬 환경에서 실행하려면 다음 단계를 따르세요.

### Prerequisites

- Node.js 18.17.0 이상
- npm 또는 yarn

### Installation & Run

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

브라우저에서 `http://localhost:3000`으로 접속하여 확인하세요.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14, React 18
- **Styling**: TailwindCSS, Framer Motion
- **State Management**: Zustand
- **Language**: JavaScript (ES6+)

---

## 📂 Project Structure

프로젝트는 Next.js App Router 방식을 따르며, 주요 기능별로 디렉토리가 구성되어 있습니다.

```
src/
├── app/                 # 페이지 라우팅 및 레이아웃
│   ├── (auth)/          # 로그인, 회원가입 관련 페이지
│   ├── nav-layout/      # 네비게이션이 포함된 레이아웃
│   ├── onboarding/      # 여행 생성 설문 및 결과
│   ├── trips/           # 여행 목록 및 상세
│   └── ...
├── components/          # 재사용 가능한 UI 컴포넌트
│   ├── common/          # 버튼, 입력창 등 공통 컴포넌트
│   ├── layout/          # 헤더, 사이드바 등 레이아웃 컴포넌트
│   └── ...
├── features/            # 기능별 비즈니스 로직 및 컴포넌트
├── hooks/               # 커스텀 훅
├── store/               # 전역 상태 관리 (Zustand)
└── styles/              # 글로벌 스타일 및 설정
```

---

## 📱 User Flow (화면 흐름)

앱의 전체적인 화면 흐름은 다음과 같습니다.

### 1. 진입 및 온보딩 (Entry & Onboarding)

1.  **Splash Screen** (`/splash`)
    - 앱 실행 시 가장 먼저 표시되며 로그인 여부를 확인합니다.

2.  **Intro (로그인/게시판 허브)** (`/intro`)
    - 모든 사용자의 진입점입니다.
    - **Guest**: "AI 여행 일정 생성하기"로 바로 시작할 수 있습니다.
    - **User**: 로그인 및 회원가입을 통해 개인화된 서비스를 이용할 수 있습니다.

3.  **Onboarding (여행 생성 설문)** (`/onboarding/...`)
    - 여행지, 날짜, 동행, 스타일 등 단계별 설문을 통해 맞춤형 일정을 생성합니다.

### 2. 메인 서비스 (Main Service)

4.  **Home Dashboard** (`/home`)
    - 로그인한 사용자를 위한 메인 화면입니다.
    - 현재 진행 중인 여행 카드와 추천 콘텐츠를 제공합니다.

5.  **Trip List** (`/trips`)
    - '여정'(예정된 여행)과 '기록'(지난 여행) 탭으로 구분된 여행 목록을 제공합니다.

### 3. 여행 상세 (Trip Detail)

6.  **Trip Detail / Result Page** (`/onboarding/result` 또는 `/trips/:tripId`)
    - 생성된 일정을 지도와 함께 3단계 스냅 바텀시트(Low, Mid, High)로 확인합니다.
    - **지도(Map)**: 배경 전면에 인터랙티브 지도가 배치되어 직관적인 경로 확인이 가능합니다.

7.  **Camera** (`/trips/:tripId/camera/:mode`)
    - 여행 중 사진 촬영(photo) 또는 영수증 스캔(receipt) 기능을 제공합니다.
