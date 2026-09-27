-- EXAMSAARTHI V2 — CURRENT REFERENCE SCHEMA
--
-- Use this file only for a CLEAN database installation.
-- For an existing database, apply the ordered files in supabase/migrations/ instead.
--
-- Security model:
--   * correct_answer_index is isolated in question_answers
--   * exam_sessions are created/finalized by authenticated server actions
--   * answers are written by server actions after ownership checks
--   * question_answers has no authenticated read policy

CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  accessibility_prefs JSONB NOT NULL DEFAULT '{"speech_rate":1,"high_contrast":false}'::jsonb,
  learning_profile_consent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  content_text TEXT NOT NULL,
  options JSONB NOT NULL,
  content_translations JSONB NOT NULL DEFAULT '{}'::jsonb,
  options_translations JSONB NOT NULL DEFAULT '{}'::jsonb,
  subject TEXT NOT NULL DEFAULT 'General',
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
  image_url TEXT,
  image_alt_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE question_answers (
  question_id UUID PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
  correct_answer_index INTEGER NOT NULL CHECK (correct_answer_index >= 0)
);

CREATE TABLE exam_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('in_progress','submitted','abandoned')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  time_remaining_seconds INTEGER,
  score INTEGER,
  total_questions INTEGER NOT NULL DEFAULT 0,
  attempted_questions INTEGER NOT NULL DEFAULT 0,
  correct_questions INTEGER NOT NULL DEFAULT 0,
  incorrect_questions INTEGER NOT NULL DEFAULT 0,
  unanswered_questions INTEGER NOT NULL DEFAULT 0,
  percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  is_practice BOOLEAN NOT NULL DEFAULT false,
  question_ids JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(question_ids) = 'array')
);

CREATE TABLE answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected_option_index INTEGER CHECK (selected_option_index IS NULL OR selected_option_index >= 0),
  marked_for_review BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, question_id)
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES exam_sessions(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX exam_sessions_candidate_started_idx ON exam_sessions(candidate_id, started_at DESC);
CREATE INDEX answers_session_idx ON answers(session_id);
CREATE INDEX questions_exam_subject_difficulty_idx ON questions(exam_id, subject, difficulty);
CREATE INDEX audit_logs_candidate_created_idx ON audit_logs(candidate_id, created_at DESC);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Authenticated users can read exams" ON exams
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read questions" ON questions
  FOR SELECT USING (auth.role() = 'authenticated');

-- Intentionally no authenticated policies on question_answers.

CREATE POLICY "Candidates view own sessions" ON exam_sessions
  FOR SELECT USING (auth.uid() = candidate_id);
-- Intentionally no authenticated INSERT/UPDATE/DELETE policy on exam_sessions.

CREATE POLICY "Candidates view own answers" ON answers
  FOR SELECT USING (
    session_id IN (SELECT id FROM exam_sessions WHERE candidate_id = auth.uid())
  );
-- Intentionally no authenticated write policy on answers.

CREATE POLICY "Candidates insert own audit logs" ON audit_logs
  FOR INSERT WITH CHECK (auth.uid() = candidate_id);
