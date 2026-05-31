"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "요청 처리에 실패했습니다.");
  return data;
}

function formatDateLabel(value) {
  if (!value) return "";
  const [, month, day] = value.split("-");
  return `${Number(month)}월 ${Number(day)}일`;
}

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeProblemNumber(value = "") {
  return String(value).replace(/[^0-9]/g, "");
}

export default function Home() {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState(null);
  const [students, setStudents] = useState([]);
  const [pdfSources, setPdfSources] = useState([]);
  const [lessonNotes, setLessonNotes] = useState([]);
  const [selectedImages, setSelectedImages] = useState([]);
  const [problemRows, setProblemRows] = useState([{ page: "", number: "", memo: "" }]);
  const [form, setForm] = useState({
    studentId: "",
    studentName: "",
    date: todayValue(),
    lessonMemo: "",
    keywords: "",
    homework: "",
    extraction: "",
    result: "",
    referencePdfId: ""
  });
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const previewRef = useRef(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!session || !supabase) return;
    loadUserData();
  }, [session]);

  useEffect(() => {
    if (!form.result || !window.MathJax?.typesetPromise || !previewRef.current) return;
    previewRef.current.textContent = form.result;
    window.MathJax.typesetPromise([previewRef.current]).catch(() => {});
  }, [form.result]);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js";
    script.async = true;
    window.MathJax = {
      tex: { inlineMath: [["\\(", "\\)"], ["$", "$"]], displayMath: [["\\[", "\\]"]] },
      svg: { fontCache: "global" }
    };
    document.body.appendChild(script);
    return () => script.remove();
  }, []);

  async function loadUserData() {
    if (!supabase) return;
    const [{ data: studentData }, { data: pdfData }, { data: noteData }] = await Promise.all([
      supabase.from("students").select("*").order("created_at", { ascending: false }),
      supabase.from("pdf_sources").select("*").order("created_at", { ascending: false }),
      supabase.from("lesson_notes").select("*, students(name)").order("lesson_date", { ascending: false }).limit(10)
    ]);
    setStudents(studentData || []);
    setPdfSources(pdfData || []);
    setLessonNotes(noteData || []);
  }

  async function signInWithGoogle() {
    if (!supabase) {
      alert("Supabase 환경변수를 먼저 설정해 주세요.");
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setStudents([]);
    setPdfSources([]);
    setLessonNotes([]);
  }

  async function addImageFiles(files) {
    const imageFiles = [...files].filter((file) => file.type.startsWith("image/"));
    const items = await Promise.all(
      imageFiles.map(async (file, index) => ({
        name: file.name || `clipboard-${Date.now()}-${index}.png`,
        dataUrl: await readFileAsDataUrl(file)
      }))
    );
    setSelectedImages((current) => [...current, ...items]);
  }

  async function handlePaste(event) {
    const files = [...event.clipboardData?.files || []].filter((file) => file.type.startsWith("image/"));
    if (!files.length) return;
    event.preventDefault();
    await addImageFiles(files);
  }

  async function saveStudentIfNeeded() {
    if (!supabase || !session) return null;
    if (form.studentId) return form.studentId;
    const name = form.studentName.trim();
    if (!name) return null;
    const { data, error } = await supabase
      .from("students")
      .insert({ name, user_id: session.user.id })
      .select()
      .single();
    if (error) throw error;
    setStudents((current) => [data, ...current]);
    setForm((current) => ({ ...current, studentId: data.id }));
    return data.id;
  }

  async function extractImages() {
    try {
      setBusy("extract");
      const data = await postJson("/api/extract", { images: selectedImages });
      setForm((current) => ({ ...current, extraction: data.text }));
    } catch (error) {
      alert(error.message);
    } finally {
      setBusy("");
    }
  }

  async function uploadPdf(event) {
    const file = event.target.files?.[0];
    if (!file || !session || !supabase) return;
    try {
      setBusy("pdf");
      const dataUrl = await readFileAsDataUrl(file);
      const indexed = await postJson("/api/pdf-index", { name: file.name, dataUrl });
      const storagePath = `${session.user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("pdf-sources").upload(storagePath, file);
      if (uploadError) throw uploadError;

      const { data: source, error: sourceError } = await supabase
        .from("pdf_sources")
        .insert({
          user_id: session.user.id,
          title: indexed.title,
          file_name: file.name,
          file_path: storagePath
        })
        .select()
        .single();
      if (sourceError) throw sourceError;

      const rows = indexed.problems.map((problem) => ({
        user_id: session.user.id,
        pdf_source_id: source.id,
        problem_number: problem.number || "",
        page: problem.page || "",
        raw_text: problem.raw_text || "",
        latex: problem.latex || [],
        topic: problem.topic || "",
        keywords: problem.keywords || []
      }));
      if (rows.length) {
        const { error: problemsError } = await supabase.from("pdf_problems").insert(rows);
        if (problemsError) throw problemsError;
      }

      setPdfSources((current) => [source, ...current]);
      setForm((current) => ({ ...current, referencePdfId: source.id }));
      setMessage(`${indexed.title} PDF에서 ${rows.length}개 문항을 저장했습니다.`);
    } catch (error) {
      alert(error.message);
    } finally {
      event.target.value = "";
      setBusy("");
    }
  }

  async function findMatchedProblems(referencePdfId, comments) {
    if (!supabase) return [];
    if (!referencePdfId || !comments.length) return [];
    const numbers = comments.map((item) => normalizeProblemNumber(item.number)).filter(Boolean);
    const memoWords = comments
      .flatMap((item) => String(item.memo || "").split(/[\s,./]+/))
      .map((word) => word.trim())
      .filter((word) => word.length >= 2);
    const { data, error } = await supabase
      .from("pdf_problems")
      .select("*")
      .eq("pdf_source_id", referencePdfId)
      .limit(500);
    if (error) throw error;
    return (data || [])
      .filter((problem) => {
        const sameNumber = numbers.includes(normalizeProblemNumber(problem.problem_number));
        const haystack = [
          problem.raw_text,
          problem.topic,
          ...(Array.isArray(problem.keywords) ? problem.keywords : []),
          ...(Array.isArray(problem.latex) ? problem.latex : [])
        ].join(" ");
        const keywordHit = memoWords.some((word) => haystack.includes(word));
        return sameNumber || keywordHit;
      })
      .slice(0, 30);
  }

  async function summarize() {
    if (!session) {
      alert("먼저 Google로 로그인해 주세요.");
      return;
    }
    try {
      setBusy("summary");
      const studentId = await saveStudentIfNeeded();
      const comments = problemRows.filter((item) => item.page || item.number || item.memo);
      const pdfSource = pdfSources.find((item) => item.id === form.referencePdfId);
      const matchedProblems = await findMatchedProblems(form.referencePdfId, comments);
      const data = await postJson("/api/summarize", {
        studentName: students.find((item) => item.id === studentId)?.name || form.studentName,
        dateLabel: formatDateLabel(form.date),
        lessonMemo: form.lessonMemo,
        lessonKeywords: form.keywords,
        homework: form.homework,
        editedExtraction: form.extraction,
        problemComments: comments,
        pdfSource,
        matchedProblems
      });
      setForm((current) => ({ ...current, result: data.text }));

      const { data: note, error } = await supabase
        .from("lesson_notes")
        .insert({
          user_id: session.user.id,
          student_id: studentId,
          lesson_date: form.date,
          lesson_memo: form.lessonMemo,
          lesson_keywords: form.keywords,
          homework: form.homework,
          extracted_content: form.extraction,
          generated_text: data.text
        })
        .select("*, students(name)")
        .single();
      if (error) throw error;
      if (comments.length) {
        const { error: commentsError } = await supabase.from("problem_comments").insert(
          comments.map((comment) => ({
            user_id: session.user.id,
            lesson_note_id: note.id,
            page: comment.page,
            problem_number: comment.number,
            memo: comment.memo
          }))
        );
        if (commentsError) throw commentsError;
      }
      setLessonNotes((current) => [note, ...current].slice(0, 10));
    } catch (error) {
      alert(error.message);
    } finally {
      setBusy("");
    }
  }

  function updateForm(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateProblemRow(index, key, value) {
    setProblemRows((current) =>
      current.map((item, rowIndex) => (rowIndex === index ? { ...item, [key]: value } : item))
    );
  }

  return (
    <main className="shell" onPaste={handlePaste}>
      <section className="topbar">
        <div>
          <p className="eyebrow">Math Lesson Note</p>
          <h1>수업 내용 및 과제 안내 생성</h1>
        </div>
        <div className="top-actions">
          {session ? (
            <>
              <span className="api-status is-ready">{session.user.email}</span>
              <button className="ghost" type="button" onClick={signOut}>로그아웃</button>
            </>
          ) : (
            <button type="button" onClick={signInWithGoogle}>Google로 로그인</button>
          )}
          <button className="ghost" type="button" onClick={() => navigator.clipboard.writeText(form.result)}>
            결과 복사
          </button>
        </div>
      </section>

      {!session && (
        <section className="panel">
          <h2>{supabase ? "로그인이 필요합니다" : "Supabase 설정이 필요합니다"}</h2>
          <p className="hint">
            {supabase
              ? "Google 계정으로 로그인하면 학생, PDF, 수업 기록이 계정별로 저장됩니다."
              : ".env.local 또는 Vercel 환경변수에 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 넣어 주세요."}
          </p>
          {supabase && <button type="button" onClick={signInWithGoogle}>Google로 시작하기</button>}
        </section>
      )}

      {session && (
        <>
          <section className="panel">
            <h2>학생 정보</h2>
            <p className="hint">학생을 선택하거나 새 이름을 입력하면 수업 기록이 학생별로 저장됩니다.</p>
            <div className="form-grid">
              <label>
                학생 선택
                <select value={form.studentId} onChange={(event) => updateForm("studentId", event.target.value)}>
                  <option value="">새 학생 입력</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>{student.name}</option>
                  ))}
                </select>
              </label>
              <label>
                학생 이름
                <input
                  value={form.studentName}
                  onChange={(event) => updateForm("studentName", event.target.value)}
                  type="text"
                  placeholder="예: 김솔비"
                  disabled={Boolean(form.studentId)}
                />
              </label>
            </div>
            <div className="form-grid">
              <label>
                수업 날짜
                <input value={form.date} onChange={(event) => updateForm("date", event.target.value)} type="date" />
              </label>
              <label>
                참고 PDF
                <select value={form.referencePdfId} onChange={(event) => updateForm("referencePdfId", event.target.value)}>
                  <option value="">- 사용 안 함 -</option>
                  {pdfSources.map((pdf) => (
                    <option key={pdf.id} value={pdf.id}>{pdf.title}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              수업 진도/내용 메모
              <textarea
                className="short"
                value={form.lessonMemo}
                onChange={(event) => updateForm("lessonMemo", event.target.value)}
                placeholder="예: 고쟁이 대수 수열의 합 진도 나갔습니다. 시그마 응용 위주."
              />
            </label>
          </section>

          <section className="panel">
            <h2>참고 PDF</h2>
            <p className="hint">교재 PDF를 업로드하면 Supabase Storage에 저장되고 문항 번호 인덱스가 DB에 저장됩니다.</p>
            <label className="file-button">
              {busy === "pdf" ? "PDF 처리 중..." : "PDF 업로드"}
              <input type="file" accept="application/pdf" onChange={uploadPdf} />
            </label>
            {message && <p className="notice">{message}</p>}
            <div className="pdf-list">
              {pdfSources.map((pdf) => (
                <div className="pdf-item" key={pdf.id}>
                  <span>{pdf.title}</span>
                  <span>{new Date(pdf.created_at).toLocaleDateString("ko-KR")}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="workspace">
            <div className="panel">
              <h2>문항 사진</h2>
              <p className="hint">캡처한 이미지는 화면 아무 곳에서나 Ctrl+V로 붙여넣을 수 있습니다.</p>
              <label className="dropzone">
                <input type="file" accept="image/*" multiple onChange={(event) => addImageFiles(event.target.files)} />
                <span>사진 선택, 드래그, 또는 클립보드 붙여넣기</span>
              </label>
              <div className="preview">
                {selectedImages.map((image) => (
                  <img key={image.name + image.dataUrl.slice(0, 20)} src={image.dataUrl} alt={image.name} />
                ))}
              </div>
              <button type="button" disabled={busy === "extract"} onClick={extractImages}>
                {busy === "extract" ? "추출 중..." : "문항/수식 추출"}
              </button>
            </div>

            <div className="panel">
              <h2>문항별 코멘트</h2>
              <p className="hint">페이지·문항 번호와 짧은 메모만 적어도 참고 PDF에서 내용을 찾아 살을 붙입니다.</p>
              <div className="problem-rows">
                {problemRows.map((row, index) => (
                  <div className="problem-row" key={index}>
                    <input value={row.page} onChange={(event) => updateProblemRow(index, "page", event.target.value)} placeholder="페이지" />
                    <input value={row.number} onChange={(event) => updateProblemRow(index, "number", event.target.value)} placeholder="문항#" />
                    <textarea value={row.memo} onChange={(event) => updateProblemRow(index, "memo", event.target.value)} placeholder="코멘트 / 메모" />
                    <button className="remove-row" type="button" onClick={() => setProblemRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}>×</button>
                  </div>
                ))}
              </div>
              <button className="ghost" type="button" onClick={() => setProblemRows((current) => [...current, { page: "", number: "", memo: "" }])}>
                + 문항 추가
              </button>
            </div>

            <div className="panel">
              <h2>AI 추출 내용 수정</h2>
              <textarea value={form.extraction} onChange={(event) => updateForm("extraction", event.target.value)} placeholder="사진에서 추출한 JSON이 여기에 표시됩니다." />
            </div>

            <div className="panel">
              <h2>수업 정보</h2>
              <label>
                수업 키워드
                <textarea className="short" value={form.keywords} onChange={(event) => updateForm("keywords", event.target.value)} placeholder="예: 고쟁이 미적분 적분 문제 풀이, 부분적분, 정적분" />
              </label>
              <label>
                과제
                <textarea className="short" value={form.homework} onChange={(event) => updateForm("homework", event.target.value)} placeholder="예: step2 끝까지, 정적분 step1 풀어오기" />
              </label>
              <button type="button" disabled={busy === "summary"} onClick={summarize}>
                {busy === "summary" ? "생성 중..." : "정리본 생성 및 저장"}
              </button>
            </div>

            <div className="panel output-panel">
              <h2>결과</h2>
              <textarea value={form.result} onChange={(event) => updateForm("result", event.target.value)} placeholder="생성된 수업 정리본이 여기에 표시됩니다." />
              <article ref={previewRef} className="math-preview" />
            </div>
          </section>

          <section className="panel">
            <h2>최근 수업 기록</h2>
            <div className="note-list">
              {lessonNotes.map((note) => (
                <button
                  className="note-item"
                  key={note.id}
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, result: note.generated_text }))}
                >
                  <span>{note.students?.name || "학생 미지정"}</span>
                  <span>{note.lesson_date}</span>
                </button>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
