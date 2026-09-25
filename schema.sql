-- ============================================
-- CCAR-F Practice Exam - Supabase Schema
-- Safe to re-run: uses IF NOT EXISTS and OR REPLACE
-- Run in Supabase Dashboard > SQL Editor > New Query
-- ============================================

-- ============================================
-- 1. TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS scenarios (
  id            SERIAL PRIMARY KEY,
  scenario_num  INTEGER UNIQUE NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT DEFAULT '',
  is_builtin    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS questions (
  id              SERIAL PRIMARY KEY,
  question_id     TEXT UNIQUE NOT NULL,
  scenario_num    INTEGER NOT NULL REFERENCES scenarios(scenario_num),
  domain          INTEGER NOT NULL CHECK (domain BETWEEN 1 AND 5),
  question_type   TEXT NOT NULL DEFAULT 'single' CHECK (question_type IN ('single','multi')),
  select_count    INTEGER DEFAULT 1,
  question_text   TEXT NOT NULL,
  options         JSONB NOT NULL,
  correct_answers TEXT[] NOT NULL,
  rationale       TEXT DEFAULT '',
  why_not         TEXT DEFAULT '',
  ref_url         TEXT DEFAULT '',
  is_builtin      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS visits (
  id          SERIAL PRIMARY KEY,
  page        TEXT DEFAULT 'home',
  ua          TEXT DEFAULT '',
  ip_hash     TEXT DEFAULT '',
  visited_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 1b. MULTI-EXAM MIGRATION
-- Adds the exam discriminator and widens the keys so a second
-- certification can share these tables. Safe on a fresh database and on
-- the existing one: the DEFAULT backfills every current row to 'ccar-f'.
-- ============================================

ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS exam TEXT NOT NULL DEFAULT 'ccar-f';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS exam TEXT NOT NULL DEFAULT 'ccar-f';
ALTER TABLE visits    ADD COLUMN IF NOT EXISTS exam TEXT NOT NULL DEFAULT 'ccar-f';

-- Prompts for mapping/matching items. NULL for ordinary choice items.
ALTER TABLE questions ADD COLUMN IF NOT EXISTS prompts JSONB;

-- The FK targets scenarios(scenario_num), so it must go before that
-- unique constraint can be replaced.
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_scenario_num_fkey;
ALTER TABLE scenarios DROP CONSTRAINT IF EXISTS scenarios_scenario_num_key;
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_question_id_key;

-- ADD CONSTRAINT has no IF NOT EXISTS in Postgres, so guard each one to
-- keep this file re-runnable.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='scenarios_exam_num_key') THEN
    ALTER TABLE scenarios ADD CONSTRAINT scenarios_exam_num_key UNIQUE (exam, scenario_num);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='questions_exam_qid_key') THEN
    ALTER TABLE questions ADD CONSTRAINT questions_exam_qid_key UNIQUE (exam, question_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='questions_exam_scenario_fkey') THEN
    ALTER TABLE questions ADD CONSTRAINT questions_exam_scenario_fkey
      FOREIGN KEY (exam, scenario_num) REFERENCES scenarios(exam, scenario_num);
  END IF;
END $$;

-- CCAR-F has 5 domains, CCAR-P has 7. Widen rather than pin to either.
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_domain_check;
ALTER TABLE questions ADD  CONSTRAINT questions_domain_check CHECK (domain BETWEEN 1 AND 12);

-- ============================================
-- 2. INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_questions_scenario ON questions(scenario_num);
CREATE INDEX IF NOT EXISTS idx_questions_domain   ON questions(domain);
CREATE INDEX IF NOT EXISTS idx_questions_builtin  ON questions(is_builtin);
CREATE INDEX IF NOT EXISTS idx_visits_date        ON visits(visited_at);
CREATE INDEX IF NOT EXISTS idx_questions_exam      ON questions(exam);
CREATE INDEX IF NOT EXISTS idx_questions_exam_dom  ON questions(exam, domain);
CREATE INDEX IF NOT EXISTS idx_scenarios_exam      ON scenarios(exam);

-- ============================================
-- 3. ROW-LEVEL SECURITY
-- ============================================

ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits     ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (safe re-run)
DROP POLICY IF EXISTS "Public read scenarios"       ON scenarios;
DROP POLICY IF EXISTS "Admin insert scenarios"      ON scenarios;
DROP POLICY IF EXISTS "Admin update scenarios"      ON scenarios;
DROP POLICY IF EXISTS "Admin delete scenarios"      ON scenarios;
DROP POLICY IF EXISTS "Service role insert scenarios" ON scenarios;
DROP POLICY IF EXISTS "Service role update scenarios" ON scenarios;
DROP POLICY IF EXISTS "Service role delete scenarios" ON scenarios;

DROP POLICY IF EXISTS "Public read questions"       ON questions;
DROP POLICY IF EXISTS "Admin insert questions"      ON questions;
DROP POLICY IF EXISTS "Admin update questions"      ON questions;
DROP POLICY IF EXISTS "Admin delete questions"      ON questions;
DROP POLICY IF EXISTS "Service role insert questions" ON questions;
DROP POLICY IF EXISTS "Service role update questions" ON questions;
DROP POLICY IF EXISTS "Service role delete questions" ON questions;

DROP POLICY IF EXISTS "Public read visits"          ON visits;
DROP POLICY IF EXISTS "Anyone can log a visit"      ON visits;

-- Recreate policies: public reads
CREATE POLICY "Public read scenarios" ON scenarios FOR SELECT USING (true);
CREATE POLICY "Public read questions" ON questions FOR SELECT USING (true);
CREATE POLICY "Public read visits"    ON visits    FOR SELECT USING (true);

-- Admin writes (service_role only)
CREATE POLICY "Admin insert scenarios" ON scenarios FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Admin update scenarios" ON scenarios FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "Admin delete scenarios" ON scenarios FOR DELETE USING (auth.role() = 'service_role');

CREATE POLICY "Admin insert questions" ON questions FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Admin update questions" ON questions FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "Admin delete questions" ON questions FOR DELETE USING (auth.role() = 'service_role');

-- Visit tracking: anyone can insert
CREATE POLICY "Anyone can log a visit" ON visits FOR INSERT WITH CHECK (true);

-- ============================================
-- 4. FUNCTIONS
-- ============================================

-- Dropped and recreated rather than CREATE OR REPLACE: adding a parameter
-- would create an overload and make the PostgREST rpc call ambiguous.
DROP FUNCTION IF EXISTS visit_stats();
DROP FUNCTION IF EXISTS visit_stats(TEXT);
CREATE FUNCTION visit_stats(p_exam TEXT DEFAULT NULL)
RETURNS JSON AS $$
  SELECT json_build_object(
    'total',  (SELECT COUNT(*) FROM visits WHERE p_exam IS NULL OR exam = p_exam),
    'today',  (SELECT COUNT(*) FROM visits WHERE (p_exam IS NULL OR exam = p_exam) AND visited_at >= CURRENT_DATE),
    'unique', (SELECT COUNT(DISTINCT ua) FROM visits WHERE (p_exam IS NULL OR exam = p_exam) AND ua != '')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================
-- 5. SEED DATA (skip if already exists)
-- ============================================

INSERT INTO scenarios (exam, scenario_num, title, description, is_builtin) VALUES
  ('ccar-f', 1, 'Customer Support Resolution Agent',
      'Building a customer support resolution agent with the Claude Agent SDK handling returns, billing disputes, and account issues via custom MCP tools.', TRUE),
  ('ccar-f', 2, 'Code Generation with Claude Code',
      'Using Claude Code for code generation, refactoring, debugging, and documentation with custom slash commands and CLAUDE.md configuration.', TRUE),
  ('ccar-f', 3, 'Multi-Agent Research System',
      'A coordinator agent delegates to specialized subagents for web search, document analysis, synthesis, and report generation to produce comprehensive cited reports.', TRUE),
  ('ccar-f', 4, 'Developer Productivity with Claude',
      'Building developer productivity tooling with the Claude Agent SDK for codebase exploration, legacy system understanding, boilerplate generation, and task automation.', TRUE),
  ('ccar-f', 5, 'Claude Code for Continuous Integration',
      'Integrating Claude Code into CI/CD for automated code review, test generation, and pull-request feedback with minimal false positives.', TRUE),
  ('ccar-f', 6, 'Structured Data Extraction',
      'Extracting information from unstructured documents, validating output against JSON schemas, handling edge cases, and integrating with downstream systems.', TRUE)
ON CONFLICT (exam, scenario_num) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  is_builtin = EXCLUDED.is_builtin;


-- Grants for admin seeding (service_role has bypass by default,
-- but explicit grants ensure compatibility)
GRANT ALL ON scenarios TO authenticated;
GRANT ALL ON questions TO authenticated;
GRANT ALL ON visits TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
