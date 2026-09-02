# Prompt: Build CCAR-F Practice Exam Web Application

Build a single-file HTML practice exam app for the Claude Certified Architect - Foundations (CCAR-F) certification, deployable on GitHub Pages with optional Supabase backend.

## Requirements

- **100 built-in questions** - verbose, scenario-based, exam-style with production context
- **6 scenarios** matching the exam guide (Customer Support, Claude Code, Multi-Agent Research, Developer Productivity, CI/CD, Structured Data Extraction)
- **5 domains** with exam blueprint weights (D1:27%, D2:18%, D3:20%, D4:20%, D5:15%)
- **Practice Mode** - 60 random questions, domain-weighted, 120-min timer, percentage scoring, three-tier verdict (80%+ STRONG PASS, 70-79% BORDERLINE, <70% NEEDS MORE STUDY)
- **Study Mode** - all questions, scenario filter tabs, submit-then-reveal flow, running score
- **Admin Panel** via #admin URL hash (not visible to regular users) - add/edit/delete questions, CSV upload with template, JSON export/import
- **Reference links** - every answer links to relevant Anthropic documentation
- **Supabase integration** - optional shared storage with localStorage fallback
- **No em dashes** - use regular hyphens throughout
- **Credits** - "Practice questions based on Certification Guide by Prakash Sridharan"

## Key documentation references

- Agent SDK: https://docs.anthropic.com/en/docs/claude-code/sdk
- Tool Use: https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview
- Claude Code Memory: https://docs.anthropic.com/en/docs/claude-code/memory
- Claude Code Hooks: https://docs.anthropic.com/en/docs/claude-code/hooks
- Claude Code MCP: https://docs.anthropic.com/en/docs/claude-code/mcp
- MCP Protocol: https://docs.anthropic.com/en/docs/agents-and-tools/mcp
- Message Batches: https://docs.anthropic.com/en/docs/build-with-claude/message-batches
- Prompt Engineering: https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview

## Deliverables

1. `index.html` - complete app (~195 KB)
2. `supabase/schema.sql` - database schema
3. `README.md` - setup and deployment guide
4. `CNAME` - custom domain (ccar-f.pratechlabs.com)
5. `PROMPT.md` - this rebuild prompt

## Design

- Fonts: Inter + JetBrains Mono
- Primary: Teal (#0f766e), domain colors: D1 purple, D2 blue, D3 amber, D4 pink, D5 emerald
- Mobile responsive, single-column below 500px
- Compact JS data format: {id, s, d, ty, se, q, o:[{l,t}], a:[], r, w, ref}

Attach the CCAR-F Exam Guide PDF and test objectives document as source material.
