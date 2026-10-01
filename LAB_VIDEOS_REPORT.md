# Lab Videos implementation report

23 September 2026. Lab Videos is implemented in the existing Pivot Sols application. The real P1 email-OTP browser check is awaiting the owner's P1 sign-in; it is not represented as completed below.

## 1. Files created

- `src/types/labVideos.ts`
- `src/data/demoLabResources.ts`
- `src/data/labVideos/productionLabResources.ts`
- `src/config/labVideos.ts`
- `src/lib/labVideos.ts`
- `src/lib/labVideoSource.ts`
- `src/pages/LabVideosPage.tsx`
- `src/components/resources/labs/LabLists.tsx`
- `src/components/resources/labs/LabVideo.tsx`
- `src/components/resources/labs/ExperimentGuide.tsx`
- `src/labs.css`
- `tests/lab-videos.test.mjs`
- `LAB_VIDEOS_DATA_GUIDE.md`
- `LAB_VIDEOS_REPORT.md`

## 2. Files modified

- `src/App.tsx`: registered protected root/nested Labs routes and removed Labs from placeholder routing.
- `src/main.tsx`: imported Labs styles.
- `src/components/common/RouteEffects.tsx`: resolved readable lab/experiment document titles.
- `src/config/studentNavigation.ts`: recognized nested Labs paths in the shell header.
- `src/lib/branchPreference.ts`: accepted the shared curriculum/preference shape for Books and Labs; retained keys, validation and storage failure behavior.
- `src/components/resources/books/ResourceEmptyState.tsx`: added an optional icon with the existing BookOpen default unchanged.
- `tests/dashboard-ui.test.mjs`: added the new page to the existing route-inspection stubs; no assertions removed or weakened.
- `README.md`: documented the functional Labs route and source locations.
- `QA.md`: recorded this phase's verification.

No dependencies were added. Generated `dist/` output and ignored build metadata were refreshed by the production build. SHA-256 checks confirm all 26 monitored auth/session, backend OTP, dashboard/shell, Reference Books page/data/styles and SQL files match their pre-task hashes. SMTP configuration and secrets were neither inspected nor changed.

## 3. Route structure

| View | P1 | E1 |
| --- | --- | --- |
| Entry | `/resources/labs` | `/resources/labs` |
| Semester chooser | `/resources/labs/p1` or entry | `/resources/labs/e1/:branch` or entry with saved branch |
| Labs | `/resources/labs/p1/:semester` | `/resources/labs/e1/:branch/:semester` |
| Experiments | `/resources/labs/p1/:semester/:labSlug` | `/resources/labs/e1/:branch/:semester/:labSlug` |
| Guide/video | `/resources/labs/p1/:semester/:labSlug/:experimentSlug` | `/resources/labs/e1/:branch/:semester/:labSlug/:experimentSlug` |

`/resources/labs?choose=branch` exposes E1 branch selection despite an existing preference. P1 has no fake branch segment. All routes remain inside ProtectedRoute and StudentShell. The existing SPA fallback is preserved. The ECE detail URL survived a full browser refresh.

## 4. Data model

`LabCatalog` contains `demo`, typed curricula and labs. `Lab` carries curriculum/semester IDs, ID, slug, name, optional description and experiments. `LabExperiment` contains ID/title/slug and optional number, objective, apparatus, theory, procedure, expected result, precautions, video type/URL, duration and reserved thumbnail metadata. IDs and slugs are stable within their documented scopes; shared programming guide objects can appear in multiple labs. No `any` or experiment dataset inside page components.

## 5. P1 flow

The existing `profile.academicLevel` selects the P1 curriculum directly. Students see Semester 1 and Semester 2, then labs, experiments and a guide. An E1 branch preference is ignored. Automated checks cover the root, both semesters, valid deep links, omitted branch UI and branch-free breadcrumbs. A real P1 email-OTP browser session remains pending owner sign-in; no session was forged or modified to substitute for that check.

## 6. E1 flow

The six branch definitions and semesters come from the existing central configuration. First-time users choose a branch. Returning users see Selected Branch and Change, with both semesters immediately available. Books and Labs reuse `pivot-sols-demo-branch` in presentation mode and the existing separate confirmed-mode key. The preference is editable and non-authoritative.

Manual verification used the owner's existing email-verified E1 session: Dashboard → Lab Videos → saved ECE → Semester 1 → Network Theory Lab → Verification of Thevenin's Theorem. Changing branches, back links, a semester breadcrumb, invalid-route recovery, profile access and refresh worked. No new test email was sent in this phase.

## 7. Demo labs

18 labs total:

| Level / branch | Semester 1 | Semester 2 |
| --- | --- | --- |
| P1 | Physics Lab; Chemistry Lab; English Language Lab | Physics Lab II; Programming Lab; Engineering Drawing / Workshop |
| E1 / ECE | Network Theory Lab; Electronic Devices Lab; C Programming Lab | Analog Electronics Lab; Digital Electronics Lab; Electrical Machines Lab |
| E1 / CSE | C Programming Lab; Data Structures Lab; Digital Logic Lab | OOP Lab; DBMS Lab; Algorithms Lab |

EEE, Mechanical, Civil and Chemical have semester navigation and honest preparation states. No detailed datasets were invented for those branches. All sample pages retain the prototype/non-official syllabus label.

## 8. Demo experiments

18 distinct sample guides, appearing in 30 lab placements:

- Network Theory: Thevenin, Norton, maximum power transfer, RC transient, RL transient and RLC response (6).
- Electronic Devices: PN diode, Zener diode, half-wave rectifier, full-wave rectifier and BJT input/output characteristics (5).
- Programming: basic input/output, functions, arrays, strings, structures and recursion (6), reused in ECE and CSE C Programming and P1 Programming labs.
- P1 Physics: measurement with a vernier caliper (1).

Other listed labs intentionally have no experiments yet. Cards show actual counts, including zero. Experiment numbers appear only when configured.

## 9. Experiment details

The guide presents the actual experiment title, lab, academic context and responsive breadcrumb. Video is followed by configured Objective, Apparatus Required, Theory, numbered Procedure, Expected Result and Precautions sections. Empty sections are omitted. The Thevenin example contains all sections; simpler examples remain concise. The result box uses the established purple accent and precautions use a muted shield icon. Back to Experiments and Back to Labs are normal links.

## 10. Video architecture

One reusable player handles validated YouTube URLs, direct MP4 and external HTTPS providers. YouTube IDs are checked and used to build a privacy-enhanced nocookie iframe after the student selects Load video. MP4 uses controls, inline playback and `preload="none"`; there is no autoplay or download action. External providers open through labelled links with `noopener noreferrer`.

Missing URLs show Video coming soon and the guide message; invalid URLs show Video unavailable without embedding anything. Media errors receive a recoverable fallback, and YouTube retains a source link for blocked embeds. The renderer does not inject HTML. No actual media was supplied, so real-provider playback, captions and delivery availability remain unverified; renderer behavior and errors are covered with fixtures.

## 11. Search

Client-side, case-insensitive search matches lab and experiment names. Scope follows the authenticated level, selected branch, semester and lab. Results contain contextual links; the query resets on navigation and has a labelled Clear search action. Browser checks verified lab-name matching, a single Norton experiment match, clear and no-match recovery. No backend search or optional filter complexity was added.

## 12. Empty and invalid states

Handled states include: branch resources being prepared; no labs for a configured semester; experiments being prepared for an empty lab; no matching labs or experiments; missing or unsupported video; and Lab resource not found with Back to Lab Videos. Unknown branches, semesters, labs, experiments, extra path segments and cross-level URLs are tested.

## 13. Responsive behavior and browser regression

Measured **320, 375, 430, 768, 1024, 1280, 1440 and 1920 CSS pixels** on branch selectors, semester selectors, lab cards and the Thevenin detail page. No horizontal document overflow occurred. Branch/lab cards are single-column on phones and two or three columns at larger widths. Semester cards stay one or two columns. The video placeholder remained 16:9 at every width; guide content is capped at 1120px.

Screenshots at 320px confirmed wrapping of the long title, readable lists and result/precaution panels. At the bottom of the guide, content cleared the fixed navigation. All five mobile destinations and the existing desktop sidebar remain present. A keyboard Tab check confirmed a visible focus outline. Existing reduced-motion behavior is retained and new transitions opt out under reduced motion. Temporary viewport overrides were reset.

Reference Books regression: Dashboard → Books → saved ECE → Semester 1 → Network Theory → both existing book listings succeeded. The profile page remained accessible. Browser console checks reported **zero errors and zero warnings** during this phase.

## 14. Frontend tests

`npm test`: **102 passed, 0 failed, 0 skipped**. This preserves all 85 previous tests and adds 17 Labs tests covering the requested route, content, preference, search, player and navigation cases. No tests were removed.

## 15. Backend OTP regression

`backend/.venv/Scripts/python.exe -m pytest` from `backend`: **45 passed**. The two existing upstream Starlette warnings about the httpx adapter and AnyIO BlockingPortal alias remain. Backend code, OTP storage and SMTP configuration are unchanged. The owner had already confirmed actual email delivery in the previous phase; this phase reused the existing verified E1 session.

## 16. Production build

`npm run build`: **passed**, including TypeScript checking and Vite production bundling, without build warnings. The prototype catalogue is included in both development and production builds while the existing presentation mode is selected. Confirmed lab data remains a separate empty catalogue until supplied.

## 17. Content needed next

Provide institution-confirmed level/branch/semester/lab mappings, approved experiment names/numbers, reviewed objectives and guide sections, and real approved YouTube/MP4/external video URLs. Include publishing permission, caption/accessibility information and optional durations. The step-by-step editing and prototype replacement instructions are in `LAB_VIDEOS_DATA_GUIDE.md`.

Implementation stops at Lab Videos. Career Domains and Career Jobs retain their existing placeholders.
