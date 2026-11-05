# CertPrep: Certification Learning Guides and Practice Exams

Free learning guides, cheat sheets and practice exams for cloud and AI certifications, live at
https://certprep.pratechlabs.com. Currently:

| Exam | Learning guide | Practice tests |
|---|---|---|
| Claude Certified Architect - Foundations (CCAR-F) | `/claude/ccar-f/learn/`: 30 lessons, 6 case studies, cheat sheet | `/claude/ccar-f/`: 120 questions, 2 fixed tests of 60 (120 min) |
| Claude Certified Architect - Professional (CCAR-P) | `/claude/ccar-p/learn/`: 38 lessons, 4 case studies, cheat sheet | `/claude/ccar-p/`: 126 questions, 2 fixed tests of 63 (120 min) |

AWS certifications are in preparation.

## Features

| Feature | Description |
|---------|-------------|
| **Learning guides** | One static lesson per exam task statement: explanation, exam traps, "In the exam" notes, check questions, a hands-on exercise set in a fictional company, and links to the official documentation. Lesson progress is tracked |
| **Guide search** | A search box on every guide page (per exam) finds lesson sections, cases and cheat sheet sections, opens the page at the matching section and highlights the words. Practice questions are never indexed |
| **Cheat sheets** | One per exam, three printed pages or fewer: decision rules, key facts and common distractors, each linked to its lesson. Prints with its own margins |
| **Practice tests** | Fixed, numbered tests in the official blueprint's domain proportions (no question shared between tests), timed, with flag-for-review and a per-domain score report |
| **Study mode** | Per test, self-paced, with submit-then-reveal answers, rationale, exam objective, a documentation link and a link to the matching lesson |
| **Random Mix** | A fresh blueprint-weighted draw from the whole published bank each time |
| **Readiness and retry** | Accuracy by domain against the pass mark, and a retry list of the questions last answered wrong |
| **Progress** | Best and latest score per test, comparison with the previous attempt, resume an unfinished test. Saved in the browser; backup and restore move it between browsers |
| **Optional sign-in** | Google, or an email with a one-time link and 6-digit code (no passwords). Progress and completed lessons sync across devices. Everything works without an account |
| **Multiple response** | "Select N" items are supported and scored all-or-nothing |
| **Shareable views** | Each exam view has its own URL (`#/study/1`, `#/practice`, `#/review`, ...), so Back and Forward work |
| **Admin** | `/#admin` (site metrics, traffic sources, account counts) and `/claude/<exam>/#admin` (custom questions, CSV upload, backups). Both open only for a signed-in admin account |

## Scoring

| Score | Verdict |
|-------|---------|
| 80%+ | **STRONG PASS** |
| 70-79% | **BORDERLINE - STRENGTHEN WEAK DOMAINS** |
| Below 70% | **NEEDS MORE STUDY** |

The real exams use scaled scoring (pass at 720 of 1000) and do not publish the conversion, so the percentage here is a guide, not a prediction. Target 80%+ overall and 75%+ in every domain.

## Architecture

A static site on GitHub Pages: no server code and no framework, vanilla JavaScript only. Content is written in Markdown in a separate, private repository and compiled into static files by Node scripts. Supabase (Postgres and Auth) handles visit counts, optional sign-in and saved progress. It never stores or serves questions.

```
 private content repo                 this repo (GitHub Pages)                  Supabase
 ---------------------                ------------------------                  --------
 <vendor>/<exam>/questions.md  --+
   config.js, refs.json,         |   tools/build.js       -> exams/<exam>.js
   tests.json, publish.json      |
 <vendor>/<exam>/learn/*.md   ---+-> tools/build-learn.js -> claude/<exam>/learn/**   (lessons, cases,
   outline.json, cheat-sheet.md  |                            cheat sheet, search.json, resources)
 site.json  ---------------------+-> tools/build-site.js  -> header/footer/cert lists in every page,
                                                             /resources/, /privacy/, sitemap.xml

 Browser: page + site.js  --(visits, insert only)---------------------------------> visits table
          account.js      --(sign-in, PKCE; Google or email link/code via Resend)--> Auth
                          --(read, merge, write own rows; RLS)---------------------> user_progress
          admin panels    --(admin's own session; is_admin() gate)-----------------> stats functions
```

- **Progress is local first.** The exam app writes `<exam>-progress` and the guide writes `<exam>-learn` to `localStorage`. When someone is signed in, `account.js` merges each key with the user's row (attempts unioned, newer graded answer wins, a lesson completed anywhere stays completed) and writes both sides. Signing out clears these keys from the browser. Progress left by a different account is replaced, never merged.
- **Account code loads only when needed**: when a session exists, on return from a sign-in link, or when someone clicks Sign in.
- **Security:** the public key in the pages is Supabase's `anon` key. Row-level security limits `user_progress` to the owner. Visit records cannot be read through the API, and the stats functions return nothing unless `is_admin()` is true for the caller.
- **Third-party code** is self-hosted under `/vendor/` (supabase-js, MiniSearch, both MIT) and loaded with pinned versions.

## Layout

```
/index.html, /hub.css           hub: every certification, grouped by vendor
/claude/index.html              Claude vendor page
/claude/<exam>/index.html       exam shell: SEO head, static summary, script tags
/claude/<exam>/learn/           learning guide, cheat sheet, search.json (GENERATED)
/claude/<exam>/resources/       documentation links per domain (GENERATED)
/resources/, /privacy/          site-wide resources and privacy policy (GENERATED)
/app.js, /app.css               exam engine and styles (zero exam-specific literals)
/exams/<exam>.js                exam config, published questions, doc links, tests (GENERATED)
/learn.js, /learn.css           learning guide: progress, search, highlights, print
/site.js, /site.css             shared header, menu, sign-in button, footer
/account.js                     sign-in dialog, account menu, progress sync, admin check
/vendor/                        supabase-js 2.45.4, MiniSearch 7.1.2
/ccar-f/, /ccar-p/              redirects from the pre-2026-10-04 paths (keep)
/tools/                         build scripts, smoke test, link checker, local server
schema.sql                      Supabase schema: visits, accounts, admins, functions
```

## Working on it

Generated files are never edited by hand. Build in this order:

```bash
node tools/build.js <content-dir>                    # exams/*.js
node tools/build-learn.js <content-dir> ccar-f       # each exam's guide, cheat sheet, search index
node tools/build-learn.js <content-dir> ccar-p
node tools/build-site.js <content-dir>               # shared chrome, /resources/, /privacy/, sitemap
node tools/smoke.js claude/ccar-f/index.html         # before every deploy, for every exam
node tools/smoke.js claude/ccar-p/index.html
node tools/check-links.js                            # every documentation link is a real page
node tools/serve.js                                  # http://localhost:8765 (root-absolute paths need a server)
```

- After changing any CSS or JS, bump the `?v=` query in the static pages (hub, vendor page, exam shells) and `assetVersion` in each guide's `outline.json`, so browsers do not pair a new page with cached code.
- `schema.sql` is idempotent. Committing it changes nothing: paste it into the Supabase SQL Editor and run it.
- After a push, check that the live page changed. A push that GitHub accepted has, at least once, not started a Pages deployment.

## Hosting

GitHub Pages from `main` / root, custom domain `certprep.pratechlabs.com` (CNAME to `prakashsridharan.github.io`), HTTPS enforced. Sign-in emails are sent through Resend from `no-reply@certprep.pratechlabs.com`. The previous domain, `ccar-f.pratechlabs.com`, is served by a separate redirect repository.

## License

MIT. Practice questions and lessons are for personal exam preparation only. This is an independent study aid, not affiliated with or endorsed by Anthropic, AWS or any other certification provider.
