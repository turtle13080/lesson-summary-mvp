# 수업 내용 및 과제 정리 앱

수학 과외 수업 후 학생에게 보낼 수업 정리본을 생성하는 Next.js 앱입니다.

## 현재 구조

- 배포: Vercel 권장
- 로그인: Supabase Auth Google OAuth
- DB: Supabase Postgres
- PDF 저장: Supabase Storage
- AI: OpenAI Responses API

## 로컬 실행

```powershell
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`으로 접속합니다.

## 환경변수

`.env.local`을 만들고 아래 값을 넣습니다.

```text
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4.1-mini
```

Vercel 배포 시에도 같은 값을 Project Settings > Environment Variables에 등록합니다.

## Supabase 설정

1. Supabase 프로젝트 생성
2. SQL Editor에서 `supabase/schema.sql` 실행
3. Authentication > Providers > Google 활성화
4. Google Cloud Console에서 OAuth Client 생성
5. Supabase Google Provider에 Client ID/Secret 입력
6. Supabase Auth URL Configuration에 배포 URL 추가

로컬 개발용 Redirect URL:

```text
http://localhost:3000/auth/callback
```

Vercel 배포용 Redirect URL:

```text
https://your-domain.vercel.app/auth/callback
```

## 주요 기능

- Google 로그인
- 학생별 수업 기록 저장
- 참고 PDF 업로드 및 문항 번호 인덱싱
- 문항 번호/키워드 기반 PDF 문항 매칭
- 문항 사진 붙여넣기 및 AI 수식 추출
- LaTeX 포함 수업 정리본 생성
- 최근 수업 기록 다시 열기

## 남은 개선 후보

- 학생 상세 페이지
- 수업 기록 검색
- PDF 인덱싱 진행률 표시
- 긴 PDF를 페이지 단위로 쪼개는 백그라운드 작업
- Render worker 추가
