-- EXAMSAARTHI V2 DATABASE SCHEMA
-- This should be run in the Supabase SQL Editor

-- 1. Profiles (extending auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  accessibility_prefs JSONB DEFAULT '{"speech_rate": 1, "high_contrast": false}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Exams
CREATE TABLE exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Questions
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  content_text TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of strings e.g. ["Mumbai", "Delhi"]
  correct_answer_index INTEGER NOT NULL, -- Never sent to client directly
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Exam Sessions
CREATE TABLE exam_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'submitted', 'abandoned')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  time_remaining_seconds INTEGER,
  score INTEGER
);

-- 5. Answers
CREATE TABLE answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES exam_sessions(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  selected_option_index INTEGER,
  marked_for_review BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, question_id)
);

-- 6. Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES exam_sessions(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- e.g., 'started_exam', 'answered_question', 'marked_review', 'submitted_exam'
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read/update their own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Exams: Anyone authenticated can read available exams
CREATE POLICY "Anyone can read exams" ON exams FOR SELECT USING (auth.role() = 'authenticated');

-- Questions: Authenticated users can read questions, but NOT the correct answer index
-- (In Supabase, we either omit the column in the query or use a view. For this MVP, we'll fetch via a secure server action that strips the correct_answer_index)
CREATE POLICY "Anyone can read questions" ON questions FOR SELECT USING (auth.role() = 'authenticated');

-- Exam Sessions: Candidates can only see/update their own sessions
CREATE POLICY "Candidates view own sessions" ON exam_sessions FOR SELECT USING (auth.uid() = candidate_id);
CREATE POLICY "Candidates insert own sessions" ON exam_sessions FOR INSERT WITH CHECK (auth.uid() = candidate_id);
CREATE POLICY "Candidates update own sessions" ON exam_sessions FOR UPDATE USING (auth.uid() = candidate_id);

-- Answers: Candidates can only see/update their own answers
CREATE POLICY "Candidates view own answers" ON answers FOR SELECT USING (
  session_id IN (SELECT id FROM exam_sessions WHERE candidate_id = auth.uid())
);
CREATE POLICY "Candidates insert/update own answers" ON answers FOR ALL USING (
  session_id IN (SELECT id FROM exam_sessions WHERE candidate_id = auth.uid())
);

-- Audit Logs: Candidates can only insert their own logs
CREATE POLICY "Candidates insert own audit logs" ON audit_logs FOR INSERT WITH CHECK (auth.uid() = candidate_id);
