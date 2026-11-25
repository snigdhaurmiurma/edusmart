import React, { useEffect, useState } from "react";
import { Award, BookOpen, CheckCircle2, Clock, Sparkles, XCircle } from "lucide-react";

import { apiRequest } from "../lib/api";
import type { NoteItem, QuizAttemptSummary, QuizGradeResult, QuizItem } from "../types";

export const QuizPage: React.FC = () => {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [attempts, setAttempts] = useState<QuizAttemptSummary[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string>("");
  const [topic, setTopic] = useState("Dynamic Programming & Graphs");
  const [courseCode, setCourseCode] = useState("CSC301");
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState("medium");
  const [timedMinutes, setTimedMinutes] = useState<number>(10);

  const [activeQuiz, setActiveQuiz] = useState<QuizItem | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [gradeResult, setGradeResult] = useState<QuizGradeResult | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);

  const loadData = async () => {
    const [noteList, quizData] = await Promise.all([
      apiRequest<NoteItem[]>("/api/notes"),
      apiRequest<{ quizzes: QuizItem[]; attempts: QuizAttemptSummary[] }>("/api/quizzes"),
    ]);
    setNotes(noteList);
    setQuizzes(quizData.quizzes);
    setAttempts(quizData.attempts);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0 || gradeResult) return;
    const id = setTimeout(() => setSecondsLeft((s) => (s ? s - 1 : 0)), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft, gradeResult]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setGradeResult(null);
    try {
      const created = await apiRequest<QuizItem>("/api/quizzes/generate", {
        method: "POST",
        body: JSON.stringify({
          note_id: selectedNoteId ? Number(selectedNoteId) : null,
          topic,
          course_code: courseCode,
          num_questions: numQuestions,
          difficulty,
          timed_minutes: timedMinutes || null,
        }),
      });
      setActiveQuiz(created);
      setAnswers({});
      setSecondsLeft(created.timed_minutes ? created.timed_minutes * 60 : null);
      loadData();
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return;
    const elapsed = activeQuiz.timed_minutes && secondsLeft !== null ? activeQuiz.timed_minutes * 60 - secondsLeft : 90;
    const result = await apiRequest<QuizGradeResult>(`/api/quizzes/${activeQuiz.id}/submit`, {
      method: "POST",
      body: JSON.stringify({ answers, duration_seconds: Math.max(10, elapsed) }),
    });
    setGradeResult(result);
    loadData();
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: "1.65rem" }}>AI-Powered Quiz Generator</h1>
        <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          Generate grounded MCQs and short-answer practice exams from your digitized notes, track mastery, and surface weak areas.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <form onSubmit={handleGenerate} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, alignItems: "end" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: 5 }}>
              Source Digitized Note (optional)
            </label>
            <select className="select" value={selectedNoteId} onChange={(e) => setSelectedNoteId(e.target.value)}>
              <option value="">Use Course / Topic Bank</option>
              {notes.map((n) => (
                <option key={n.id} value={n.id}>
                  [{n.course_code}] {n.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: 5 }}>Topic</label>
            <input className="input" value={topic} onChange={(e) => setTopic(e.target.value)} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: 5 }}>Course</label>
            <input className="input" value={courseCode} onChange={(e) => setCourseCode(e.target.value.toUpperCase())} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: 5 }}>Questions</label>
            <select className="select" value={numQuestions} onChange={(e) => setNumQuestions(Number(e.target.value))}>
              {[3, 4, 5, 6, 8].map((n) => (
                <option key={n} value={n}>{n} Questions</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: 5 }}>Difficulty</label>
            <select className="select" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: 5 }}>Timer (min)</label>
            <input
              className="input"
              type="number"
              min={0}
              max={60}
              value={timedMinutes}
              onChange={(e) => setTimedMinutes(Number(e.target.value))}
            />
          </div>
          <button type="submit" className="btn btn-gradient" disabled={generating}>
            <Sparkles size={16} /> {generating ? "Generating..." : "Generate Quiz"}
          </button>
        </form>
      </div>

      {activeQuiz && !gradeResult && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <span className="badge badge-purple">{activeQuiz.course_code} • {activeQuiz.difficulty}</span>
              <h2 style={{ fontSize: "1.25rem", marginTop: 6 }}>{activeQuiz.title}</h2>
            </div>
            {secondsLeft !== null && (
              <span className="badge badge-amber" style={{ fontSize: "0.9rem", padding: "6px 12px" }}>
                <Clock size={15} /> {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
              </span>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {activeQuiz.questions.map((q, idx) => (
              <div key={q.id} style={{ padding: 16, borderRadius: 12, background: "var(--bg-subtle)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <strong>Q{idx + 1}. {q.prompt}</strong>
                  <span className="badge badge-blue">{q.topic}</span>
                </div>
                {q.type === "mcq" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                    {q.options.map((opt) => (
                      <label
                        key={opt}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "9px 12px",
                          borderRadius: 9,
                          background: answers[q.id] === opt ? "rgba(123, 47, 247, 0.14)" : "var(--bg-card)",
                          border: `1px solid ${answers[q.id] === opt ? "var(--brand-purple)" : "var(--border-subtle)"}`,
                          cursor: "pointer",
                          fontSize: "0.9rem",
                        }}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          checked={answers[q.id] === opt}
                          onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <input
                    className="input"
                    style={{ marginTop: 8, background: "var(--bg-card)" }}
                    placeholder="Type your short answer..."
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
            <button className="btn btn-gradient" onClick={handleSubmitQuiz}>
              Submit &amp; Grade Quiz
            </button>
          </div>
        </div>
      )}

      {gradeResult && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: "1.35rem" }}>{gradeResult.quiz_title} — Results</h2>
              <p style={{ margin: "4px 0 0", color: "var(--text-secondary)" }}>
                Score: <strong>{gradeResult.score_percent}%</strong> ({gradeResult.correct_count}/{gradeResult.total_questions} correct)
              </p>
            </div>
            <button className="btn btn-white btn-sm" onClick={() => setGradeResult(null)}>
              Take Another Quiz
            </button>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {Object.entries(gradeResult.topic_breakdown).map(([t, pct]) => (
              <span key={t} className={`badge ${pct >= 70 ? "badge-green" : "badge-red"}`}>
                {t}: {pct}%
              </span>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {gradeResult.results.map((r, i) => (
              <div
                key={r.id}
                style={{
                  padding: 14,
                  borderRadius: 12,
                  background: r.is_correct ? "var(--green-bg)" : "var(--pink-bg)",
                  borderLeft: `4px solid ${r.is_correct ? "#22c55e" : "#ef4444"}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
                  {r.is_correct ? <CheckCircle2 size={17} color="#16a34a" /> : <XCircle size={17} color="#dc2626" />}
                  <span>Q{i + 1}: {r.prompt}</span>
                </div>
                <div style={{ fontSize: "0.86rem", marginTop: 6 }}>
                  Your answer: <strong>{r.your_answer || "(blank)"}</strong> | Correct: <strong>{r.correct_answer}</strong>
                </div>
                <div style={{ fontSize: "0.84rem", color: "var(--text-secondary)", marginTop: 4 }}>
                  {r.explanation}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <h3 style={{ fontSize: "1.05rem", marginBottom: 12 }}>Saved Quizzes</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {quizzes.map((q) => (
              <div key={q.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, borderRadius: 10, background: "var(--bg-subtle)" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.92rem" }}>{q.title}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    {q.course_code} • {q.questions.length} questions • {q.difficulty}
                  </div>
                </div>
                <button
                  className="btn btn-white btn-sm"
                  onClick={() => {
                    setActiveQuiz(q);
                    setAnswers({});
                    setGradeResult(null);
                    setSecondsLeft(q.timed_minutes ? q.timed_minutes * 60 : null);
                  }}
                >
                  <BookOpen size={14} /> Practice
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: "1.05rem", marginBottom: 12 }}>Recent Quiz Attempts</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {attempts.map((a) => (
              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, borderRadius: 10, background: "var(--bg-subtle)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Award size={18} color={a.score_percent >= 75 ? "#16a34a" : "#d97706"} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{a.course_code}</div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      {a.correct_count}/{a.total_questions} correct • {new Date(a.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <span className={`badge ${a.score_percent >= 75 ? "badge-green" : "badge-amber"}`}>
                  {a.score_percent}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
