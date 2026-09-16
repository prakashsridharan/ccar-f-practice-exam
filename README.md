# CCAR-F Practice Exam

Interactive practice exam for the **Claude Certified Architect - Foundations (CCAR-F)** certification.

Practice questions based on the CCAR-F Certification Guide.

## Features

| Feature | Description |
|---------|-------------|
| **Practice Mode** | 60 randomly selected questions weighted by exam blueprint, 120-minute timer, percentage-based scoring with domain breakdown |
| **Study Mode** | Browse all 100 questions grouped by domain (D1-D5), with submit-then-reveal answers, rationale, and reference links to Anthropic docs |
| **Admin Panel** | Accessible via `#admin` URL - add questions, bulk CSV upload, edit/delete, JSON export/import |
| **Persistent Storage** | Supabase (PostgreSQL) for shared questions; falls back to the 100 built-in questions if Supabase is unreachable, with localStorage holding admin-added custom content |
| **Reference Links** | Every answer includes a direct link to relevant Anthropic documentation |
| **Zero Backend** | Static HTML on GitHub Pages - no server to maintain |

## Question Bank

100 original, verbose, scenario-based questions across 6 exam scenarios and 5 domains.

| Scenario | Questions | Primary Domains |
|----------|-----------|-----------------|
| S1: Customer Support Resolution Agent | 17 | D1, D2, D5 |
| S2: Code Generation with Claude Code | 19 | D3, D1, D5 |
| S3: Multi-Agent Research System | 20 | D1, D2, D5 |
| S4: Developer Productivity with Claude | 15 | D2, D3, D5 |
| S5: Claude Code for Continuous Integration | 13 | D3, D4 |
| S6: Structured Data Extraction | 16 | D4, D2, D5 |

## Exam Blueprint Weights

Practice Mode selects 60 questions using these proportions:

| Domain | Name | Weight | Questions |
|--------|------|--------|-----------|
| D1 | Agentic Architecture & Orchestration | 27% | 16 |
| D2 | Tool Design & MCP Integration | 18% | 11 |
| D3 | Claude Code Configuration & Workflows | 20% | 12 |
| D4 | Prompt Engineering & Structured Output | 20% | 12 |
| D5 | Context Management & Reliability | 15% | 9 |

## Scoring

| Score | Verdict |
|-------|---------|
| 80%+ (48+/60) | **STRONG PASS** |
| 70-79% (42-47/60) | **BORDERLINE - STRENGTHEN WEAK DOMAINS** |
| Below 70% | **NEEDS MORE STUDY** |

The real exam uses scaled scoring (100-1000, pass at 720) where questions carry different weights. Target 80%+ overall and 75%+ in every domain for a confident pass.

## Architecture

```
GitHub Pages (static hosting, free)
    |
    +-- index.html       <- single-file app (100 built-in questions)
    +-- schema.sql       <- Supabase schema, run by hand in the SQL Editor
    +-- CNAME            <- custom domain
    +-- README.md
    |
    v fetches questions at runtime (optional)
    |
Supabase (PostgreSQL, free tier)
    +-- scenarios table
    +-- questions table
    +-- visits table + visit_stats() RPC
    +-- RLS: public reads, admin writes
```

## Setup Guide

### Step 1: Create a Supabase project (optional)

1. Go to [supabase.com](https://supabase.com) - free tier
2. Create a project, wait for provisioning
3. Go to **Project Settings > API** and copy the **Project URL** and **anon/public** key

### Step 2: Run the database schema

1. Supabase Dashboard > **SQL Editor** > **New Query**
2. Paste contents of `schema.sql` (repo root) and click **Run**

The schema is idempotent, so it is safe to re-run after edits.

### Step 3: Configure the app

In `index.html`, find and fill in:
```javascript
const SUPABASE_URL  = '';  // your Project URL
const SUPABASE_ANON = '';  // your anon/public key
```

The **service_role** key is entered at runtime via the Admin panel, stored only in the admin's browser.

### Step 4: Deploy to GitHub Pages

```bash
git init && git add . && git commit -m "CCAR-F Practice Exam v1.0"
gh repo create prakashsridharan/ccar-f-practice-exam --public --push
```

Enable Pages: repo Settings > Pages > main branch > / (root) > Save.

### Step 5: Connect GoDaddy domain

```
Type    Name      Value                       TTL
CNAME   ccar-f    prakashsridharan.github.io   600
```

Then in GitHub: Settings > Pages > Custom domain: `ccar-f.pratechlabs.com` > Enforce HTTPS.

## Admin Panel

Access at `https://your-site.com/#admin`

- **Add Question** - form with scenario, domain, type, options, rationale
- **Add Scenario** - create new scenario sections
- **Upload CSV** - bulk import with downloadable template
- **Export/Import JSON** - backup and restore custom questions

### CSV Template Columns

| Column | Required | Description |
|--------|----------|-------------|
| scenario_number | Yes | 1-6 or new number |
| scenario_title | If new | Title for new scenarios |
| scenario_description | If new | Description for new scenarios |
| domain | Yes | 1-5 |
| type | Yes | single or multi |
| select_count | If multi | How many to select |
| question | Yes | Question text |
| option_a - option_e | Min 2 | Answer options |
| correct_answers | Yes | e.g., B or A,C |
| rationale | Yes | Why correct |
| why_not | Optional | Why others wrong |

## Credits

- Practice questions based on the CCAR-F Certification Guide
- Reference links to [Anthropic documentation](https://docs.anthropic.com)

## License

MIT. Practice questions are for personal exam preparation only.
