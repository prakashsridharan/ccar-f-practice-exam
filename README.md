# Certification Practice Exams

Free, scenario-based practice exams for cloud and AI certifications, live at
https://certprep.pratechlabs.com. Currently:

| Exam | Path | Questions | Practice tests |
|---|---|---|---|
| Claude Certified Architect - Foundations (CCAR-F) | `/claude/ccar-f/` | 100 | 1 fixed test of 60 questions, 120 min |
| Claude Certified Architect - Professional (CCAR-P) | `/claude/ccar-p/` | 315 | 5 fixed tests of 63 questions, 120 min |

## Features

| Feature | Description |
|---------|-------------|
| **Practice tests** | Fixed, numbered tests in the official blueprint's domain proportions (no question shared between tests), timed, with flag-for-review and a per-domain score report |
| **Random Mix** | A fresh blueprint-weighted draw from the whole bank each time |
| **Progress** | Best and latest score per test, comparison with the previous attempt, resume an unfinished test, review incorrect or flagged answers. Saved in the browser; export/import moves it between devices |
| **Study Mode** | Every question grouped by domain, with submit-then-reveal answers, rationale, exam objective and a link to the official documentation |
| **Multiple response** | "Select N" items are supported and scored all-or-nothing |
| **Shareable views** | Each view has its own URL (`#/study`, `#/practice`, ...), so Back and Forward work |
| **Admin** | `/#admin` shows visitor metrics and links to each exam's admin (`/claude/<exam>/#admin`): add questions, CSV upload, JSON backup and restore of custom questions |
| **Zero backend** | Static files on GitHub Pages. Supabase is used only for anonymous visit counts |

## Scoring

| Score | Verdict |
|-------|---------|
| 80%+ | **STRONG PASS** |
| 70-79% | **BORDERLINE - STRENGTHEN WEAK DOMAINS** |
| Below 70% | **NEEDS MORE STUDY** |

The real exams use scaled scoring (pass at 720 of 1000) and do not publish the conversion, so the percentage here is a guide, not a prediction. Target 80%+ overall and 75%+ in every domain.

## Layout

```
/index.html, /hub.css          hub: every certification, grouped by vendor
/claude/index.html             Claude vendor page
/claude/<exam>/index.html      exam shell: SEO head, static summary, script tags
/app.js, /app.css              shared exam engine and styles
/exams/<exam>.js               exam config, question bank, documentation links (GENERATED)
/ccar-f/, /ccar-p/             redirects from the pre-2026-10-04 paths (keep)
/tools/                        build, smoke test, link checker, local server
schema.sql                     Supabase schema (visits table + visit_stats RPC)
```

## Working on it

Question banks are authored in Markdown in a separate, private content repository and compiled into `exams/<exam>.js`. Never edit the generated files by hand.

```bash
node tools/make-tests.js <exam-dir> <count>    # once per exam: split the bank into fixed tests (tests.json)
node tools/build.js <content-dir>              # regenerate exams/*.js
node tools/smoke.js claude/ccar-f/index.html   # run before every deploy, for every exam
node tools/check-links.js                      # every documentation link resolves to a real page
node tools/serve.js                            # http://localhost:8765 (root-absolute paths need a server)
```

After changing `app.js`, `app.css` or an exam file, bump the `?v=` query on the script and stylesheet tags in every exam shell, so browsers do not pair a new page with a cached engine.

## Hosting

GitHub Pages from `main` / root, custom domain `certprep.pratechlabs.com` (GoDaddy `CNAME certprep -> prakashsridharan.github.io`), HTTPS enforced. The previous domain, `ccar-f.pratechlabs.com`, is served by a separate redirect repository.

## License

MIT. Practice questions are for personal exam preparation only. This is an independent study aid, not affiliated with or endorsed by Anthropic.
