export function extractionPrompt() {
  return `
너는 고2, 고3 내신/수능 대비 수학 과외 수업 기록 보조자다.
업로드된 문항 사진에서 문제 번호, 문제 내용, 수식, 핵심 개념, 수업 중 강조할 만한 포인트를 추출하라.

반드시 JSON만 반환하라. 마크다운 코드블록은 쓰지 마라.
스키마:
{
  "problems": [
    {
      "number": "문항 번호 또는 빈 문자열",
      "raw_text": "문제 원문. 보이는 만큼 정확히.",
      "latex": ["수식은 LaTeX 문자열 배열로"],
      "topic": "핵심 단원/유형",
      "key_points": ["풀이 핵심"],
      "cautions": ["실수하기 쉬운 점"]
    }
  ],
  "uncertain": ["사진이 흐리거나 확신이 낮은 부분"]
}

수식은 가능한 한 LaTeX로 적고, 확실하지 않은 내용은 uncertain에 남겨라.
없는 내용을 지어내지 마라.
`.trim();
}

export function pdfIndexPrompt(pdfName) {
  return `
첨부한 PDF는 수학 문제집 또는 수업 자료다. 문항 번호로 나중에 검색할 수 있도록 인덱스를 만들어라.
파일명: ${pdfName}

반드시 JSON만 반환하라. 마크다운 코드블록은 쓰지 마라.
스키마:
{
  "title": "교재명 또는 자료명",
  "problems": [
    {
      "number": "문항 번호",
      "page": "PDF 페이지 또는 교재 페이지",
      "raw_text": "문제 내용 요약. 수식은 LaTeX로 보존",
      "topic": "단원/유형",
      "keywords": ["검색용 키워드"],
      "latex": ["핵심 수식 LaTeX"]
    }
  ]
}

문항 번호가 보이는 항목 위주로 추출하라.
PDF가 길면 모든 문항을 무리하게 다 쓰기보다 번호, 페이지, 주제, 핵심 수식 중심으로 간결하게 정리하라.
`.trim();
}

export function summaryPrompt({
  studentName,
  dateLabel,
  lessonKeywords,
  lessonMemo,
  homework,
  editedExtraction,
  problemComments = [],
  referenceContext
}) {
  return `
너는 한국에서 고2, 고3 내신/수능 대비 수학 과외를 오래 해온 선생님이다.
아래 자료를 바탕으로 학생에게 보낼 "수업 내용 및 과제 안내"를 작성하라.

작성 스타일:
- 첫 문장: "안녕하세요 ${dateLabel || "오늘"} 수업 내용 및 과제 안내드립니다."
- 다음 문장: "수업 내용 : ..." 형식으로 교재/단원/주요 수업 내용을 한 문장으로 요약
- 이후 문항별 코멘트는 "#문항번호" 형식으로 시작
- 문항별 코멘트는 풀이 핵심, 판단 기준, 복습 포인트 중심으로 작성
- 문항 번호와 짧은 메모만 있더라도 참고 PDF 문항 정보를 이용해 내용을 살려라
- 말투는 친절하지만 과하게 꾸미지 않는다
- "복습 필수", "꼭 확인", "유의하셔야 합니다" 같은 직접적인 복습 안내를 자연스럽게 사용
- 수식은 LaTeX 표기 \\(...\\) 또는 \\[...\\]를 유지
- 마지막은 반드시 "과제 : ${homework || "입력된 과제 범위 없음"}" 형식
- 자료에 없는 내용은 지어내지 않는다

학생 이름:
${studentName || "(없음)"}

수업 키워드:
${lessonKeywords || "(없음)"}

수업 진도/내용 메모:
${lessonMemo || "(없음)"}

문항별 코멘트 입력:
${JSON.stringify(problemComments, null, 2)}

사진에서 추출하고 사용자가 검수/수정한 문항 내용:
${editedExtraction || "(없음)"}

참고 PDF에서 매칭된 문항 정보:
${referenceContext || "(없음)"}
`.trim();
}

export function formatReferenceContext(pdfSource, problems) {
  if (!pdfSource || !problems?.length) return "";
  return JSON.stringify(
    {
      pdfTitle: pdfSource.title || pdfSource.file_name,
      matchedProblems: problems
    },
    null,
    2
  );
}
