import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Cpu,
  Database,
  FileScan,
  FlaskConical,
  Globe,
  GraduationCap,
  Layers,
  Moon,
  Pause,
  Play,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Sun,
  Zap,
} from "lucide-react";

import { EduSmartLogo } from "../components/EduSmartLogo";
import { HeroIllustration } from "../components/HeroIllustration";
import { apiRequest } from "../lib/api";
import type { Citation } from "../types";

interface LandingPageProps {
  onStart: () => void;
  onWatchDemo: () => void;
  demoLoading: boolean;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

interface ModuleSpec {
  id: string;
  category: "ai" | "study" | "planning";
  icon: React.FC<{ size?: number }>;
  title: string;
  tagline: string;
  desc: string;
  highlights: string[];
  bg: string;
  color: string;
}

const MODULES: ModuleSpec[] = [
  {
    id: "uniq",
    category: "ai",
    icon: Sparkles,
    title: "UNIQ RAG Assistant",
    tagline: "Hybrid BM25 + Vector RAG",
    desc: "Answers questions directly from YOUR university policies, syllabi, and notes with inline citations and clickable Action Chips.",
    highlights: ["Pre-ranking per-student tenant isolation", "Live BM25 + Cosine match transparency", "Works with ANY university handbook or notes"],
    bg: "rgba(123, 47, 247, 0.14)",
    color: "#7b2ff7",
  },
  {
    id: "advisor",
    category: "ai",
    icon: GraduationCap,
    title: "Advisor Bot",
    tagline: "Degree & Prerequisite Guide",
    desc: "Plans balanced semesters from your enrolled & completed courses, checking credit progress and avoiding lab conflicts.",
    highlights: ["Adapts to your university & major", "Tracks completed credits & prerequisites", "Proposes conflict-free next-term loads"],
    bg: "rgba(29, 85, 196, 0.14)",
    color: "#2563eb",
  },
  {
    id: "research",
    category: "ai",
    icon: FlaskConical,
    title: "Research Bot",
    tagline: "IEEE Literature & Citations",
    desc: "Generates precision IEEE Xplore / ACM search queries, methodology checklists, and formatted references from your research notes.",
    highlights: ["Boolean search query builder", "Empirical methodology checklists", "IEEE citation templates"],
    bg: "rgba(224, 0, 168, 0.14)",
    color: "#e000a8",
  },
  {
    id: "ocr",
    category: "study",
    icon: FileScan,
    title: "Handwritten Notes Digitizer",
    tagline: "Drag-Drop OCR → RAG",
    desc: "Drop photos, PDFs, or text notes to extract editable Markdown, highlight low-confidence OCR lines, and export to PDF/MD/TXT.",
    highlights: ["Auto-indexes every note into RAG", "Live Edit & Preview modes", "Cascade vector purge when deleted"],
    bg: "rgba(14, 165, 233, 0.14)",
    color: "#0284c7",
  },
  {
    id: "quiz",
    category: "study",
    icon: BookOpen,
    title: "AI Quiz Generator",
    tagline: "Grounded Active Recall",
    desc: "Generate timed MCQs & short-answer quizzes from digitized notes or pasted lecture text with instant grading and topic mastery.",
    highlights: ["Quiz any note or pasted syllabus", "Auto-submitting countdown timer", "Flags weak topics for review"],
    bg: "rgba(34, 197, 94, 0.15)",
    color: "#16a34a",
  },
  {
    id: "calendar",
    category: "planning",
    icon: Calendar,
    title: "Smart Academic Calendar",
    tagline: "Month Grid + Conflict Fix",
    desc: "Interactive Month Grid & Agenda views with automatic overlap conflict detection, 1-click auto-resolve, and .ics import/export.",
    highlights: ["Import .ics from Canvas/Moodle/Google", "Detects overlapping time slots live", "1-click .ics calendar export"],
    bg: "rgba(245, 158, 11, 0.16)",
    color: "#d97706",
  },
  {
    id: "routine",
    category: "planning",
    icon: Clock,
    title: "Intelligent Routine Generator",
    tagline: "Adaptive Study Scheduler",
    desc: "Builds realistic Morning, Afternoon, and Evening study plans around fixed classes, deadlines, focus windows, and weak topics.",
    highlights: ["Add/toggle custom study blocks", "Adapts to wake/sleep & focus hours", "1-click push routine into Calendar"],
    bg: "rgba(239, 68, 68, 0.14)",
    color: "#dc2626",
  },
  {
    id: "sync",
    category: "planning",
    icon: Globe,
    title: "Any University & Portal Sync",
    tagline: "Manual + UCAM / ELMS / .ICS",
    desc: "Works anywhere in the world: add your university info, handbook, and courses manually, import .ics schedules, or sync UCAM & ELMS.",
    highlights: ["Universal university handbook → RAG", "Manual courses + assignments CRUD", "UCAM, ELMS, Canvas & Moodle .ics ready"],
    bg: "rgba(99, 102, 241, 0.14)",
    color: "#4f46e5",
  },
];

const MINI_QUIZ = [
  {
    q: "Why does Hybrid RAG combine BM25 keyword search with dense vector similarity?",
    options: [
      "To capture both exact course codes/terms AND semantic meaning",
      "To replace databases with static HTML pages",
      "To disable citations in chatbot answers",
    ],
    answer: 0,
  },
  {
    q: "Which study method produces the strongest long-term exam retention?",
    options: [
      "Highlighting paragraphs passively once",
      "Active recall with spaced-repetition quizzes & error review",
      "Cramming all chapters the night before",
    ],
    answer: 1,
  },
  {
    q: "How can any student from any university bring their timetable into EduSmart?",
    options: [
      "Only by hardcoding it into source code",
      "Manually add courses/tasks, upload a handbook, or import any .ics / UCAM / ELMS feed",
      "Wait for manual IT setup",
    ],
    answer: 1,
  },
];

const STUDY_LOOP = [
  { step: "01", title: "Add University & Notes", desc: "Enter your university info, upload handwritten photos/PDFs, or import a .ics timetable. Everything is chunked into your private RAG index.", badge: "Universal Setup" },
  { step: "02", title: "Query Hybrid RAG Bots", desc: "Ask UNIQ, Advisor, or Research bots anything. Hybrid BM25 + cosine retrieval returns grounded answers with exact source citations.", badge: "Hybrid RAG" },
  { step: "03", title: "Test with AI Quizzes", desc: "Turn your notes into timed MCQs and short-answer exams, track topic mastery, and uncover weak spots automatically.", badge: "Active Recall" },
  { step: "04", title: "Build Adaptive Routines", desc: "Schedule realistic Morning/Afternoon/Evening blocks around fixed classes and push them straight to your Smart Calendar.", badge: "Smart Routine" },
];

const FAQS = [
  {
    q: "Can students from ANY university in the world use EduSmart?",
    a: "Yes! During sign-up or in Courses & Sync, enter your university name, upload or paste your university's handbook/syllabus into RAG, add your own courses and assignments manually, import any .ics calendar from Canvas/Moodle/Blackboard/Google Calendar, or use UCAM/ELMS sync.",
  },
  {
    q: "How does the Hybrid RAG chatbot work and keep my notes private?",
    a: "EduSmart runs BM25 lexical + dense vector cosine retrieval with strict pre-ranking tenant SQL isolation—only your own chunks and public university docs are searched. Deleting a note immediately cascade-purges its vectors.",
  },
  {
    q: "Does EduSmart support both Dark Mode and Light Mode?",
    a: "Yes! Click the Moon/Sun toggle in the top bar anytime—your theme preference persists seamlessly across the landing page, auth screens, student workspace, and admin console.",
  },
  {
    q: "Can I try it right now without creating an account?",
    a: "Yes! Play with the interactive Hybrid RAG Sandbox (even with your own pasted university text!), Mini-Quiz, and Pomodoro Focus Timer right below—or click 'Watch Demo' to explore the full workspace instantly.",
  },
];

interface RagDemoResult {
  answer: string;
  provider: string;
  latency_ms: number;
  corpus_chunks_scanned: number;
  citations: Citation[];
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStart,
  onWatchDemo,
  demoLoading,
  theme,
  onToggleTheme,
}) => {
  const [category, setCategory] = useState<"all" | "ai" | "study" | "planning">("all");
  const [selectedModule, setSelectedModule] = useState<ModuleSpec>(MODULES[0]);
  const [activeLoopIdx, setActiveLoopIdx] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [sandboxTab, setSandboxTab] = useState<"rag" | "quiz" | "timer">("rag");

  // Live RAG Playground (with Custom University Text toggle!)
  const [ragBot, setRagBot] = useState<"uniq" | "advisor" | "research">("uniq");
  const [ragQuery, setRagQuery] = useState("How do merit scholarships and tuition waivers work?");
  const [useCustomUni, setUseCustomUni] = useState(false);
  const [customUniName, setCustomUniName] = useState("My University");
  const [customContext, setCustomContext] = useState(
    "At My University, students need 120 credits to graduate. The midterm withdrawal deadline is Week 8. Lab attendance must be at least 80% to sit for final practical exams. Dean's List honors require a semester GPA of 3.75 or higher."
  );
  const [ragLoading, setRagLoading] = useState(false);
  const [ragResult, setRagResult] = useState<RagDemoResult | null>(null);

  // Fun Interactive Mini-Quiz State
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [pickedOpt, setPickedOpt] = useState<number | null>(null);
  const [quizDone, setQuizDone] = useState(false);

  // Fun Interactive Pomodoro Focus Timer State
  const [timerMode, setTimerMode] = useState<"focus" | "break">("focus");
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [studyMood, setStudyMood] = useState("Deep Focus");

  // Support Form State
  const [supName, setSupName] = useState("");
  const [supEmail, setSupEmail] = useState("");
  const [supMsg, setSupMsg] = useState("");
  const [supNotice, setSupNotice] = useState<string | null>(null);

  // Animated Stat Counter
  const [toolCount, setToolCount] = useState(1);
  useEffect(() => {
    const id = setInterval(() => {
      setToolCount((c) => {
        if (c >= 8) {
          clearInterval(id);
          return 8;
        }
        return c + 1;
      });
    }, 80);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  const runLiveRagDemo = async (
    customQ?: string,
    customB?: "uniq" | "advisor" | "research",
    forceCustomMode?: boolean
  ) => {
    const q = (customQ ?? ragQuery).trim();
    const b = customB ?? ragBot;
    const isCustom = forceCustomMode ?? useCustomUni;
    if (!q) return;
    setRagLoading(true);
    try {
      const res = await apiRequest<RagDemoResult>("/api/public/rag-demo", {
        method: "POST",
        body: JSON.stringify({
          query: q,
          bot_type: b,
          custom_context: isCustom ? customContext : null,
          university_name: isCustom ? customUniName : null,
        }),
      });
      setRagResult(res);
    } catch {
      // ignore
    } finally {
      setRagLoading(false);
    }
  };

  useEffect(() => {
    runLiveRagDemo();
  }, []);

  const answerMiniQuiz = (optIdx: number) => {
    if (pickedOpt !== null) return;
    setPickedOpt(optIdx);
    if (optIdx === MINI_QUIZ[quizIdx].answer) {
      setQuizScore((s) => s + 1);
    }
  };

  const nextMiniQuiz = () => {
    if (quizIdx + 1 >= MINI_QUIZ.length) {
      setQuizDone(true);
    } else {
      setQuizIdx((i) => i + 1);
      setPickedOpt(null);
    }
  };

  const resetMiniQuiz = () => {
    setQuizIdx(0);
    setQuizScore(0);
    setPickedOpt(null);
    setQuizDone(false);
  };

  const submitSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiRequest<{ message: string }>("/api/public/support", {
      method: "POST",
      body: JSON.stringify({ name: supName, email: supEmail, message: supMsg }),
    });
    setSupNotice(res.message);
    setSupName("");
    setSupEmail("");
    setSupMsg("");
  };

  const filteredModules = category === "all" ? MODULES : MODULES.filter((m) => m.category === category);

  return (
    <div className="landing-shell">
      {/* Sticky Glass Navbar with Dark / Light Theme Switcher */}
      <header className="sticky-landing-nav">
        <nav className="landing-nav" style={{ padding: "14px 28px" }}>
          <EduSmartLogo variant="student" compact />
          <div className="landing-nav-links" style={{ flexWrap: "wrap" }}>
            <a href="#top">Home</a>
            <span className="landing-nav-sep">|</span>
            <a href="#playground">Interactive Lab</a>
            <span className="landing-nav-sep">|</span>
            <a href="#features">Features</a>
            <span className="landing-nav-sep">|</span>
            <a href="#how-it-works">Workflow</a>
            <span className="landing-nav-sep">|</span>
            <a href="#support">Support</a>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              className="btn btn-white btn-sm"
              onClick={onToggleTheme}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              aria-label="Toggle dark and light mode"
            >
              {theme === "dark" ? <><Sun size={15} color="#facc15" /> Light</> : <><Moon size={15} color="#7b2ff7" /> Dark</>}
            </button>
            <button className="btn btn-white btn-sm" onClick={onStart}>Sign In</button>
            <button className="btn btn-gradient btn-sm" onClick={onWatchDemo} disabled={demoLoading}>
              {demoLoading ? "Opening..." : "Launch App"}
            </button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section id="top" className="landing-hero">
        <div className="anim-fade-up">
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span className="badge badge-purple"><Globe size={13} /> Built for Students at Any University Worldwide</span>
          </div>
          <h1 className="hero-title">
            Your All-in-One
            <span className="hero-title-gradient">Academic Assistant</span>
          </h1>
          <p className="hero-subtitle">
            Bring your own university courses, handbooks, handwritten notes, or portal calendars (UCAM, ELMS, Canvas, Moodle &amp; .ics).
            Chat with Hybrid RAG AI, generate timed quizzes, and master every semester in one joyful workspace.
          </p>
          <div className="hero-actions">
            <button className="btn btn-gradient" onClick={onStart}>
              Start Your Journey <ArrowRight size={18} />
            </button>
            <button className="btn btn-white" onClick={onWatchDemo} disabled={demoLoading}>
              {demoLoading ? "Launching..." : "Watch Demo"}
            </button>
            <a href="#playground" className="btn btn-soft">
              <Sparkles size={16} color="var(--brand-purple)" /> Play With Live AI
            </a>
          </div>
          <div className="hero-stats">
            <div className="hero-stat-card anim-fade-up anim-delay-1">
              <div className="hero-stat-num">{toolCount}+</div>
              <div className="hero-stat-label">AI-Powered Tools</div>
            </div>
            <div className="hero-stat-card anim-fade-up anim-delay-1">
              <div className="hero-stat-num">Any Uni</div>
              <div className="hero-stat-label">Manual + Portal Sync</div>
            </div>
            <div className="hero-stat-card anim-fade-up anim-delay-2">
              <div className="hero-stat-num">100%</div>
              <div className="hero-stat-label">Free &amp; Private RAG</div>
            </div>
          </div>
        </div>

        <div className="anim-float">
          <HeroIllustration />
        </div>
      </section>

      {/* FUN INTERACTIVE PLAYGROUND (3 Live Widgets Visitors Can Actually Play With!) */}
      <section id="playground" className="landing-section">
        <div className="card" style={{ padding: 28, border: "2px solid rgba(123, 47, 247, 0.28)", boxShadow: "var(--shadow-lg)" }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 14, marginBottom: 22 }}>
            <div>
              <span className="badge badge-purple"><Zap size={13} /> Interactive Sandbox — Try Without Signing Up</span>
              <h2 style={{ fontSize: "1.8rem", marginTop: 8 }}>Experience EduSmart Live Right Here</h2>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className={`btn btn-sm ${sandboxTab === "rag" ? "btn-gradient" : "btn-soft"}`} onClick={() => setSandboxTab("rag")}>
                <Cpu size={14} /> Live Hybrid RAG
              </button>
              <button className={`btn btn-sm ${sandboxTab === "quiz" ? "btn-gradient" : "btn-soft"}`} onClick={() => setSandboxTab("quiz")}>
                <Award size={14} /> Rapid Quiz Game
              </button>
              <button className={`btn btn-sm ${sandboxTab === "timer" ? "btn-gradient" : "btn-soft"}`} onClick={() => setSandboxTab("timer")}>
                <Clock size={14} /> Focus Timer
              </button>
            </div>
          </div>

          {/* TAB 1: LIVE HYBRID RAG (BUILT-IN OR YOUR OWN UNIVERSITY TEXT!) */}
          {sandboxTab === "rag" && (
            <div className="anim-fade-up">
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {(["uniq", "advisor", "research"] as const).map((b) => (
                    <button
                      key={b}
                      className={`btn btn-sm ${ragBot === b ? "btn-gradient" : "btn-white"}`}
                      onClick={() => {
                        setRagBot(b);
                        runLiveRagDemo(undefined, b);
                      }}
                    >
                      {b === "uniq" ? "UNIQ RAG" : b === "advisor" ? "Advisor RAG" : "Research RAG"}
                    </button>
                  ))}
                </div>

                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 14px",
                    borderRadius: 999,
                    background: useCustomUni ? "rgba(123, 47, 247, 0.14)" : "var(--bg-subtle)",
                    fontSize: "0.84rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={useCustomUni}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setUseCustomUni(next);
                      const q = next
                        ? "What is the withdrawal deadline and Dean's List GPA requirement?"
                        : "How do merit scholarships and tuition waivers work?";
                      setRagQuery(q);
                      runLiveRagDemo(q, ragBot, next);
                    }}
                  />
                  <Globe size={14} color="var(--brand-purple)" /> Paste YOUR Own University Info / Notes
                </label>
              </div>

              {useCustomUni && (
                <div className="card anim-fade-up" style={{ marginBottom: 14, padding: 14, background: "var(--bg-subtle)" }}>
                  <div style={{ display: "flex", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                    <input
                      className="input"
                      style={{ maxWidth: 260, background: "var(--bg-card)" }}
                      value={customUniName}
                      onChange={(e) => setCustomUniName(e.target.value)}
                      placeholder="Your University Name"
                    />
                    <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)", alignSelf: "center" }}>
                      Paste any syllabus, grading rule, or lecture note below and ask a question about it!
                    </span>
                  </div>
                  <textarea
                    className="textarea"
                    rows={3}
                    style={{ background: "var(--bg-card)" }}
                    value={customContext}
                    onChange={(e) => setCustomContext(e.target.value)}
                  />
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  runLiveRagDemo();
                }}
                style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}
              >
                <input
                  className="input"
                  style={{ flex: "1 1 320px" }}
                  value={ragQuery}
                  onChange={(e) => setRagQuery(e.target.value)}
                  placeholder="Ask any question..."
                />
                <button type="submit" className="btn btn-gradient" disabled={ragLoading}>
                  <Zap size={16} /> {ragLoading ? "Retrieving..." : "Ask RAG Engine"}
                </button>
              </form>

              {!useCustomUni && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
                  {[
                    "How do merit scholarships and tuition waivers work?",
                    "What are the two properties of Dynamic Programming and Dijkstra complexity?",
                    "What are the CSE degree credit requirements and prerequisites?",
                    "What are the rules for IEEE citations and medical exam deferrals?",
                  ].map((sample) => (
                    <button
                      key={sample}
                      type="button"
                      className="btn btn-soft btn-sm"
                      onClick={() => {
                        setRagQuery(sample);
                        runLiveRagDemo(sample);
                      }}
                    >
                      {sample}
                    </button>
                  ))}
                </div>
              )}

              {ragResult && (
                <div className="grid-2 anim-fade-up" style={{ alignItems: "start" }}>
                  <div style={{ padding: 18, borderRadius: 14, background: "var(--bg-subtle)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                      <strong style={{ fontSize: "0.94rem" }}>Grounded RAG Answer</strong>
                      <span className="badge badge-green">
                        {ragResult.latency_ms} ms • {ragResult.corpus_chunks_scanned} chunks scanned
                      </span>
                    </div>
                    <div style={{ whiteSpace: "pre-wrap", fontSize: "0.88rem", lineHeight: 1.65 }}>
                      {ragResult.answer}
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                      <Database size={14} /> LIVE VECTOR + BM25 RETRIEVAL SCORES
                    </div>
                    {ragResult.citations.map((c) => (
                      <div key={c.chunk_id} style={{ padding: 12, borderRadius: 12, border: "1px solid var(--border-subtle)", background: "var(--bg-card)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 5 }}>
                          <strong style={{ fontSize: "0.85rem" }}>{c.title}</strong>
                          <span className="badge badge-purple">{Math.round(c.score * 100)}%</span>
                        </div>
                        <p style={{ margin: "0 0 8px", fontSize: "0.79rem", color: "var(--text-secondary)" }}>{c.excerpt}...</p>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.72rem", color: "var(--text-muted)" }}>
                          <span>BM25 {Math.round((c.bm25_score || 0) * 100)}%</span>
                          <div className="rag-score-bar"><div className="rag-score-fill" style={{ width: `${Math.min(100, Math.round(c.score * 100))}%` }} /></div>
                          <span>Cosine {Math.round((c.cosine_score || 0) * 100)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FUN RAPID-FIRE MINI-QUIZ GAME */}
          {sandboxTab === "quiz" && (
            <div className="anim-fade-up" style={{ maxWidth: 680, margin: "0 auto", padding: "8px 0" }}>
              {quizDone ? (
                <div style={{ textAlign: "center", padding: 26, borderRadius: 16, background: "var(--bg-subtle)" }}>
                  <Award size={44} color="#eab308" style={{ marginBottom: 10 }} />
                  <h3 style={{ fontSize: "1.5rem" }}>
                    You scored {quizScore} / {MINI_QUIZ.length}!
                  </h3>
                  <p style={{ color: "var(--text-secondary)", margin: "8px 0 18px" }}>
                    {quizScore === MINI_QUIZ.length
                      ? "Perfect streak! Inside EduSmart you can auto-generate unlimited quizzes straight from your lecture PDFs and notes."
                      : "Nice try! Inside EduSmart every wrong answer gets instant explanations and feeds into your adaptive study routine."}
                  </p>
                  <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
                    <button className="btn btn-white" onClick={resetMiniQuiz}><RotateCcw size={15} /> Play Again</button>
                    <button className="btn btn-gradient" onClick={onWatchDemo}>Open Full Quiz Generator <ArrowRight size={15} /></button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: 22, borderRadius: 16, background: "var(--bg-subtle)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <span className="badge badge-purple">Question {quizIdx + 1} of {MINI_QUIZ.length}</span>
                    <span className="badge badge-green">Score: {quizScore}</span>
                  </div>
                  <h3 style={{ fontSize: "1.18rem", marginBottom: 16 }}>{MINI_QUIZ[quizIdx].q}</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {MINI_QUIZ[quizIdx].options.map((opt, idx) => {
                      const isPicked = pickedOpt === idx;
                      const isCorrect = idx === MINI_QUIZ[quizIdx].answer;
                      let border = "var(--border-subtle)";
                      let bg = "var(--bg-card)";
                      if (pickedOpt !== null) {
                        if (isCorrect) {
                          border = "#22c55e";
                          bg = "var(--green-bg)";
                        } else if (isPicked) {
                          border = "#ef4444";
                          bg = "var(--pink-bg)";
                        }
                      }
                      return (
                        <button
                          key={opt}
                          onClick={() => answerMiniQuiz(idx)}
                          style={{
                            textAlign: "left",
                            padding: "13px 16px",
                            borderRadius: 12,
                            border: `2px solid ${border}`,
                            background: bg,
                            color: "var(--text-primary)",
                            fontWeight: 600,
                            fontSize: "0.92rem",
                            transition: "transform 0.15s ease",
                          }}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  {pickedOpt !== null && (
                    <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
                      <button className="btn btn-gradient btn-sm" onClick={nextMiniQuiz}>
                        {quizIdx + 1 >= MINI_QUIZ.length ? "See Results" : "Next Question"} <ArrowRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: INTERACTIVE POMODORO FOCUS TIMER */}
          {sandboxTab === "timer" && (
            <div className="anim-fade-up" style={{ maxWidth: 560, margin: "0 auto", textAlign: "center", padding: 24, borderRadius: 16, background: "var(--bg-subtle)" }}>
              <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                {["Deep Focus", "Exam Sprint", "Chill Notes"].map((m) => (
                  <button key={m} className={`btn btn-sm ${studyMood === m ? "btn-gradient" : "btn-white"}`} onClick={() => setStudyMood(m)}>
                    {m}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--brand-purple)" }}>
                {studyMood.toUpperCase()} • {timerMode === "focus" ? "25 MIN SESSION" : "5 MIN RECHARGE"}
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "3.6rem", fontWeight: 800, margin: "10px 0 18px" }}>
                {String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:{String(secondsLeft % 60).padStart(2, "0")}
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
                <button className="btn btn-gradient" onClick={() => setTimerRunning((r) => !r)}>
                  {timerRunning ? <><Pause size={16} /> Pause</> : <><Play size={16} /> Start Focus</>}
                </button>
                <button
                  className="btn btn-white"
                  onClick={() => {
                    setTimerRunning(false);
                    setSecondsLeft(timerMode === "focus" ? 25 * 60 : 5 * 60);
                  }}
                >
                  <RotateCcw size={15} /> Reset
                </button>
                <button
                  className="btn btn-soft"
                  onClick={() => {
                    const next = timerMode === "focus" ? "break" : "focus";
                    setTimerMode(next);
                    setTimerRunning(false);
                    setSecondsLeft(next === "focus" ? 25 * 60 : 5 * 60);
                  }}
                >
                  Switch to {timerMode === "focus" ? "5m Break" : "25m Focus"}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Interactive Feature Card System */}
      <section id="features" className="landing-section">
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
          <div>
            <span className="badge badge-purple">Interactive Card System</span>
            <h2 style={{ fontSize: "2rem", marginTop: 8 }}>All 8 Modules — Ready for Any University</h2>
            <p style={{ color: "var(--text-secondary)", margin: "6px 0 0", maxWidth: 580 }}>
              Filter by track and click any card to explore how EduSmart adapts to your courses, notes, and campus portal.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { id: "all", label: "All 8 Modules" },
              { id: "ai", label: "AI RAG Chatbots" },
              { id: "study", label: "Study & OCR" },
              { id: "planning", label: "Planning & Sync" },
            ].map((t) => (
              <button
                key={t.id}
                className={`btn btn-sm ${category === t.id ? "btn-gradient" : "btn-white"}`}
                onClick={() => {
                  setCategory(t.id as typeof category);
                  const next = t.id === "all" ? MODULES[0] : MODULES.find((m) => m.category === t.id) || MODULES[0];
                  setSelectedModule(next);
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="module-grid">
          {filteredModules.map((m) => {
            const Icon = m.icon;
            const isSelected = selectedModule.id === m.id;
            return (
              <div
                key={m.id}
                className={`module-card module-card-interactive ${isSelected ? "selected" : ""}`}
                onClick={() => setSelectedModule(m)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setSelectedModule(m)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div className="module-icon" style={{ background: m.bg, color: m.color }}><Icon size={22} /></div>
                  <span className="badge badge-blue">{m.tagline}</span>
                </div>
                <h3 style={{ fontSize: "1.06rem", marginBottom: 8 }}>{m.title}</h3>
                <p style={{ margin: 0, fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>{m.desc}</p>
              </div>
            );
          })}
        </div>

        <div key={selectedModule.id} className="card anim-fade-up" style={{ marginTop: 22, padding: 26, borderColor: "rgba(123, 47, 247, 0.35)" }}>
          <div className="grid-2" style={{ alignItems: "center" }}>
            <div>
              <span className="badge badge-purple">Module Spotlight</span>
              <h3 style={{ fontSize: "1.45rem", marginTop: 8 }}>{selectedModule.title}</h3>
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.6, marginTop: 8 }}>{selectedModule.desc}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
                {selectedModule.highlights.map((h) => (
                  <div key={h} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.9rem", fontWeight: 500 }}>
                    <CheckCircle2 size={17} color={selectedModule.color} /><span>{h}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
              <div style={{ padding: 18, borderRadius: 14, background: "var(--bg-subtle)", width: "100%" }}>
                <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: 6 }}>UNIVERSAL COMPATIBILITY</div>
                <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 6 }}>{selectedModule.tagline}</div>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  Add your own university courses, upload your handbook into RAG, import .ics schedules from Canvas/Moodle/Google, or connect UCAM &amp; ELMS.
                </p>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="btn btn-gradient" onClick={onStart}>Create Free Account <ArrowRight size={16} /></button>
                <button className="btn btn-white" onClick={onWatchDemo} disabled={demoLoading}>Try Instant Demo</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive 4-Step Connected Study Loop */}
      <section id="how-it-works" className="landing-section">
        <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 28px" }}>
          <span className="badge badge-blue"><Layers size={13} /> Connected Workflow</span>
          <h2 style={{ fontSize: "1.9rem", marginTop: 8 }}>One Unified Loop for Every Semester</h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12, marginBottom: 18 }}>
          {STUDY_LOOP.map((item, idx) => (
            <button
              key={item.step}
              onClick={() => setActiveLoopIdx(idx)}
              className={`card module-card-interactive ${activeLoopIdx === idx ? "selected" : ""}`}
              style={{ textAlign: "left", padding: 18 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", fontWeight: 800, color: "var(--brand-purple)" }}>{item.step}</span>
                <span className="badge badge-blue">{item.badge}</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: "1rem" }}>{item.title}</div>
            </button>
          ))}
        </div>

        <div key={activeLoopIdx} className="card anim-fade-up" style={{ padding: 24, background: "var(--bg-subtle)", border: "none" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div style={{ maxWidth: 740 }}>
              <span className="badge badge-purple">Step {STUDY_LOOP[activeLoopIdx].step}</span>
              <h3 style={{ fontSize: "1.3rem", marginTop: 8 }}>{STUDY_LOOP[activeLoopIdx].title}</h3>
              <p style={{ margin: "8px 0 0", color: "var(--text-secondary)", lineHeight: 1.65 }}>{STUDY_LOOP[activeLoopIdx].desc}</p>
            </div>
            <button className="btn btn-gradient" onClick={onStart}>Get Started Free <ArrowRight size={16} /></button>
          </div>
        </div>
      </section>

      {/* Interactive FAQ + Working Support Form */}
      <section id="support" className="landing-section" style={{ paddingBottom: 64 }}>
        <div className="grid-2" style={{ alignItems: "start" }}>
          <div>
            <span className="badge badge-blue"><ShieldCheck size={13} /> Questions &amp; Privacy</span>
            <h2 style={{ fontSize: "1.7rem", margin: "8px 0 18px" }}>Frequently Asked Questions</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {FAQS.map((item, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={item.q} className={`faq-item ${isOpen ? "open" : ""}`}>
                    <button className="faq-trigger" onClick={() => setOpenFaq(isOpen ? null : idx)}>
                      <span>{item.q}</span>
                      <ChevronDown size={18} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s ease", flexShrink: 0 }} />
                    </button>
                    {isOpen && (
                      <div style={{ padding: "0 20px 16px", fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card" style={{ padding: 26 }}>
            <h3 style={{ fontSize: "1.25rem", marginBottom: 6 }}>Questions or Campus Integration?</h3>
            <p style={{ margin: "0 0 16px", color: "var(--text-secondary)", fontSize: "0.88rem" }}>
              Send a message straight to the EduSmart support log.
            </p>
            {supNotice && (
              <div style={{ background: "#dcfce7", color: "#166534", padding: "10px 14px", borderRadius: 10, marginBottom: 14, fontSize: "0.86rem", fontWeight: 600 }}>
                {supNotice}
              </div>
            )}
            <form onSubmit={submitSupport} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input className="input" required placeholder="Your Name" value={supName} onChange={(e) => setSupName(e.target.value)} />
              <input className="input" type="email" required placeholder="you@university.edu" value={supEmail} onChange={(e) => setSupEmail(e.target.value)} />
              <textarea className="textarea" rows={4} required placeholder="Tell us about your university or how we can help..." value={supMsg} onChange={(e) => setSupMsg(e.target.value)} />
              <button type="submit" className="btn btn-gradient"><Send size={15} /> Send Message</button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};
