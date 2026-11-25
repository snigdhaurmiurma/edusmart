export interface User {
  id: number;
  full_name: string;
  email: string;
  role: "student" | "admin";
  student_id: string | null;
  university_name: string;
  lms_platform: string;
  major: string;
  trimester: string;
  credits_completed: number;
  cgpa: number | null;
  theme: string;
  consent_rag_personal: boolean;
  consent_ocr_processing: boolean;
  consent_ucam_sync: boolean;
  email_notifications: boolean;
  digest_mode: string;
  is_active: boolean;
  created_at: string;
}

export interface Citation {
  chunk_id: number;
  title: string;
  source_type?: string;
  course_code: string;
  score: number;
  bm25_score?: number;
  cosine_score?: number;
  excerpt: string;
}

export interface ActionChip {
  label: string;
  action: "add_calendar" | "seed_routine" | "generate_quiz" | "open_sync" | "open_notes";
  payload: Record<string, string>;
}

export interface RagMeta {
  provider?: string;
  latency_ms?: number;
  corpus_scanned?: number;
  scope?: string;
}

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
  action_chips: ActionChip[];
  rag_meta?: RagMeta;
  created_at: string;
}

export interface ChatSessionSummary {
  id: number;
  bot_type: "uniq" | "advisor" | "research";
  title: string;
  updated_at: string;
  message_count: number;
}

export interface LowConfidenceLine {
  line_number: number;
  text: string;
  confidence: number;
  suggestion: string;
}

export interface NoteItem {
  id: number;
  title: string;
  course_code: string;
  tags: string;
  content: string;
  summary: string;
  source_filename: string | null;
  ocr_confidence: number;
  low_confidence_lines: LowConfidenceLine[];
  created_at: string;
  updated_at: string;
}

export interface QuizQuestion {
  id: string;
  type: "mcq" | "short";
  topic: string;
  prompt: string;
  options: string[];
}

export interface QuizItem {
  id: number;
  note_id: number | null;
  title: string;
  course_code: string;
  difficulty: string;
  timed_minutes: number | null;
  questions: QuizQuestion[];
  created_at: string;
}

export interface QuizAttemptSummary {
  id: number;
  quiz_id: number;
  course_code: string;
  score_percent: number;
  correct_count: number;
  total_questions: number;
  duration_seconds: number;
  topic_breakdown: Record<string, number>;
  created_at: string;
}

export interface QuizGradeResult {
  attempt_id: number;
  quiz_title: string;
  course_code: string;
  score_percent: number;
  correct_count: number;
  total_questions: number;
  topic_breakdown: Record<string, number>;
  weak_topics: string[];
  results: {
    id: string;
    topic: string;
    prompt: string;
    your_answer: string;
    correct_answer: string;
    is_correct: boolean;
    explanation: string;
  }[];
}

export interface CalendarEventItem {
  id: number;
  title: string;
  event_type: "class" | "exam" | "assignment" | "study";
  course_code: string;
  start_time: string;
  end_time: string;
  priority: "high" | "medium" | "low";
  reminder_minutes: number;
  completed: boolean;
  source: string;
}

export interface CalendarConflict {
  event_a_id: number;
  event_a_title: string;
  event_b_id: number;
  event_b_title: string;
  suggested_start: string;
  suggested_end: string;
}

export interface RoutineBlockItem {
  id: number;
  day_label: string;
  period: "morning" | "afternoon" | "evening";
  start_label: string;
  end_label: string;
  title: string;
  course_code: string;
  category: string;
  priority: string;
  completed: boolean;
}

export interface RoutineResponse {
  blocks: RoutineBlockItem[];
  completed_count: number;
  total_count: number;
  completion_rate: number;
  streak_days: number;
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  category: string;
  action_route: string | null;
  is_read: boolean;
  created_at: string;
}

export type AppRoute =
  | "landing"
  | "auth"
  | "dashboard"
  | "chat-uniq"
  | "chat-advisor"
  | "chat-research"
  | "notes"
  | "quizzes"
  | "calendar"
  | "routine"
  | "sync"
  | "analytics"
  | "feedback"
  | "profile"
  | "admin";
