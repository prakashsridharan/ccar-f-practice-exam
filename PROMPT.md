# Requirements: CertPrep

The requirements and design decisions behind the site, written so that it could be rebuilt from this file. README.md describes the architecture and how to build it. The original 2026 brief for the single-file CCAR-F app is kept at the end for history.

## Product

- A free study site for certification exams. It starts with the Claude Certified Architect exams (CCAR-F Foundations, CCAR-P Professional) and is built to add other vendors (AWS next) without code changes. Adding an exam means a content folder, an entry in `site.json` and an exam shell.
- Every exam offers three things: a **learning guide**, a **cheat sheet** and **practice tests**. All three are free, and none needs an account.
- Exams live at `/<vendor>/<exam>/`. The hub lists every certification grouped by vendor. Each vendor has its own page.
- Every page shares one header (brand, Certifications menu, Resources, Sign in), the exam tab bar (Learning guide / Practice tests / Resources) and a footer with the privacy link.

## Content rules

- All questions and lessons are **original**, written from the public exam guides and the providers' documentation. Nothing comes from a real exam.
- Each lesson maps to one exam task statement and teaches the exam guide's wording. Where current documentation differs from the exam guide, a note explains both.
- Case studies and exercises use fictional, US-based companies.
- Questions: 4 plausible options of similar length (within about 15%). The correct option must not carry its own justification. Answer letters are spread evenly over A-D. Each question has a rationale, a "why the others are wrong" line, an exam objective and a link to a section of the official documentation that was checked to exist.
- "Select N" items state how many to select and are scored all-or-nothing.
- Practice tests are fixed sets that follow the blueprint's domain weights, with no question shared between tests. A published test is never changed or regenerated, because people's score history depends on it.
- Only the tests listed in the content repo's `publish.json` are published. The full bank stays in the private content repo.
- **Copy style:** no em or en dashes (plain hyphens), no chat phrasing, no personal byline or company branding in visible copy. Every page says it is an independent study aid, not affiliated with or endorsed by the certification provider. Pages never describe content that does not exist.

## Learning guide

- Curriculum page, domain pages, one page per lesson, case studies and a Resources page per exam (documentation links grouped by domain, official certification pages first).
- Each lesson has an explanation, callouts (trap, rule, example, note), "In the exam" notes, 3 check questions, an "Apply it" exercise with a model answer and self-check list, sources and, where relevant, short code snippets.
- Lesson completion and exercise ticks are saved. The exam home shows progress through the guide.
- **Search (per exam):** a search box on every guide page and on the cheat sheet. It indexes lesson sections, callouts, cases and cheat sheet sections, never practice questions. Matching uses prefixes, light typo tolerance and exam synonyms (HITL, RAG, PII, ...).
  - Opening a result goes to the matching section and highlights the words, with a bar to clear the highlights or return to all results.
  - The lesson list keeps its scroll position and marks the current lesson.
- From a practice question's answer, "Read lesson X" opens the matching lesson. A return point brings the learner back to the same question.

## Cheat sheet

- One per exam, at most 3 printed pages on A4 or Letter with the browser's default margins. One section per domain in the domain colour, each point linked to its lesson. The "at a glance" strip is generated from the exam config, never typed in.
- Prints with its own margin even when the print dialog's margins are set to Minimum.

## Practice tests (exam app)

- The exam home is test-first: a tab per test plus Random Mix, then two modes for the selected test:
  - **Exam mode:** timed with the blueprint duration, flag-for-review, question navigator, auto-submit at 0:00, score report by domain.
  - **Study mode:** self-paced, submit then reveal, with rationale, documentation link and lesson link.
- Leaving an exam pauses it; it can be resumed or discarded from home.
- The report compares with the previous attempt on the same test. Review has All / Incorrect / Flagged / Unanswered filters.
- Readiness shows accuracy by domain against the pass mark (needs at least 5 answers per domain), plus "Retry the questions you missed", overall or per domain.
- Scoring is a percentage with three verdicts (80%+ STRONG PASS, 70-79% BORDERLINE, below 70% NEEDS MORE STUDY), not an invented scaled score.
- Every view has a URL (`#/study/<n>`, `#/practice`, `#/report`, `#/review`, `#/retry`), and Back/Forward work.

## Accounts and progress

- Progress is saved in the browser by default. Backup and restore move it between browsers without an account.
- **Sign-in is optional:** one "Sign in" button with no separate sign-up and no passwords. The first sign-in creates the account.
  - Sign in with Google, or with an email containing both a link and a 6-digit code. The code covers opening the email on another device.
  - Sign-in emails come from `no-reply@certprep.pratechlabs.com`.
- Signed in, practice scores, answers, study state and completed lessons sync across devices. Merging never loses work: attempts are combined, the newer answer wins, and a lesson completed anywhere stays completed.
- Progress made while signed out joins the account at the next sign-in.
- Signing out saves to the account, then clears the browser, so the next person starts fresh. Progress left in the browser by a different account is never merged into another account.
- The account menu has Sign out and Delete my account. Deleting removes the account and its saved progress immediately.
- The privacy policy (`/privacy/`) lists what is stored, the services used and how to delete it. No advertising cookies.

## Admin

- `/#admin` (site) shows visits, traffic sources by campaign, top guide pages and account counts (numbers only, no emails). `/<vendor>/<exam>/#admin` manages custom questions kept in that browser.
- Both open only for a signed-in account listed in the database's `admins` table. The data functions themselves refuse non-admins, so hiding the panel is not the only protection.

## Visits and SEO

- Each page records a visit with its path, utm source and campaign, and the referring host. The utm tags are then removed from the address bar.
- Every page has its own canonical URL, Open Graph tags and JSON-LD. A static summary sits inside the app container for crawlers that do not run JavaScript, and must describe only what the page really offers.
- `robots.txt` hides repository files and the search indexes. `sitemap.xml` is regenerated by the build.

## Engineering constraints

- Static hosting only (GitHub Pages). Vanilla JavaScript, no framework, no build step in the browser.
- Questions are never read from the database.
- Generated files are never edited by hand.
- Asset URLs carry a version that is bumped whenever CSS or JS changes.
- Third-party libraries are self-hosted with pinned versions.
- The smoke test runs the real engine against every exam page before each deploy, and again against the live pages afterwards.
- The site must work at phone width with no horizontal scrolling. The sign-in button collapses to an icon on phones.

## Design

- Fonts: Inter (body), JetBrains Mono (ids, timer, scores, code).
- Colours: navy `#1B4F8A` (primary), dark navy `#1A2E45` (headers, hover), rust `#C0522A` for warnings and borderline states (not red).
- Domain colours: D1 teal `#0097A7`, D2 blue `#2E86C1`, D3 purple `#5B38B6`, D4 rust `#C0522A`, D5 navy `#1B4F8A`; further domains come from a fixed palette.
- Logo: a progress ring closing into a check, with the wordmark "CertPrep".
- The home page header stays compact: a heading, a one-sentence subtitle and a row of feature tags.

---

## Appendix: original brief (2026, historical)

The first version was a single `index.html` for CCAR-F only:

- 100 built-in questions over 6 scenarios and 5 domains (D1 27%, D2 18%, D3 20%, D4 20%, D5 15%).
- Practice mode: 60 random, domain-weighted questions with a 120-minute timer.
- Study mode grouped by domain rather than scenario, to match how the official score report breaks results down.
- A hidden `#admin` panel and optional Supabase question storage with a built-in fallback.
- Every answer linked to Anthropic documentation, and no em dashes.

Everything above supersedes it: the shared engine, per-exam data built from Markdown, fixed tests, learning guides, search, sign-in, and Supabase used for visits and accounts only, never for questions.
