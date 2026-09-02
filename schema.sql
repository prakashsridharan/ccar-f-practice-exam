-- ============================================
-- CCAR-F Practice Exam - Supabase Schema
-- Run in Supabase Dashboard > SQL Editor > New Query
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

CREATE INDEX IF NOT EXISTS idx_questions_scenario ON questions(scenario_num);
CREATE INDEX IF NOT EXISTS idx_questions_domain   ON questions(domain);

ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read scenarios" ON scenarios FOR SELECT USING (true);
CREATE POLICY "Public read questions" ON questions FOR SELECT USING (true);
CREATE POLICY "Admin write scenarios" ON scenarios FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Admin update scenarios" ON scenarios FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "Admin delete scenarios" ON scenarios FOR DELETE USING (auth.role() = 'service_role');
CREATE POLICY "Admin write questions" ON questions FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Admin update questions" ON questions FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "Admin delete questions" ON questions FOR DELETE USING (auth.role() = 'service_role');

INSERT INTO scenarios (scenario_num, title, description, is_builtin) VALUES
  (1, 'Customer Support Resolution Agent', 'Building a customer support resolution agent with the Claude Agent SDK handling returns, billing disputes, and account issues via custom MCP tools.', TRUE),
  (2, 'Code Generation with Claude Code', 'Using Claude Code for code generation, refactoring, debugging, and documentation with custom slash commands and CLAUDE.md configuration.', TRUE),
  (3, 'Multi-Agent Research System', 'A coordinator agent delegates to specialized subagents for web search, document analysis, synthesis, and report generation to produce comprehensive cited reports.', TRUE),
  (4, 'Developer Productivity with Claude', 'Building developer productivity tooling with the Claude Agent SDK for codebase exploration, legacy system understanding, boilerplate generation, and task automation.', TRUE),
  (5, 'Claude Code for Continuous Integration', 'Integrating Claude Code into CI/CD for automated code review, test generation, and pull-request feedback with minimal false positives.', TRUE),
  (6, 'Structured Data Extraction', 'Extracting information from unstructured documents, validating output against JSON schemas, handling edge cases, and integrating with downstream systems.', TRUE)
ON CONFLICT (scenario_num) DO NOTHING;

-- ============================================
-- Visitor Tracking
-- ============================================

CREATE TABLE IF NOT EXISTS visits (
  id          SERIAL PRIMARY KEY,
  page        TEXT DEFAULT 'home',
  ua          TEXT DEFAULT '',
  ip_hash     TEXT DEFAULT '',
  visited_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visits_date ON visits(visited_at);

ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (for tracking visits)
CREATE POLICY "Anyone can log a visit"
  ON visits FOR INSERT
  WITH CHECK (true);

-- Allow reads for admin (service_role) and anon (for the stats RPC)
CREATE POLICY "Public read visits"
  ON visits FOR SELECT
  USING (true);

-- RPC function to get visit stats (avoids exposing raw visit data)
CREATE OR REPLACE FUNCTION visit_stats()
RETURNS JSON AS $$
  SELECT json_build_object(
    'total', (SELECT COUNT(*) FROM visits),
    'today', (SELECT COUNT(*) FROM visits WHERE visited_at >= CURRENT_DATE),
    'unique', (SELECT COUNT(DISTINCT ua) FROM visits WHERE ua != '')
  );
$$ LANGUAGE sql SECURITY DEFINER;
