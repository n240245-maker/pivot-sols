# Reference Books prototype report

Completed 21 September 2026. The existing Pivot Sols project now provides a working local Reference Books experience in development and built demo previews. Demo authentication, real authentication code, dashboard layout and student navigation were preserved.

Authentication update, 22 September: this report records the original books release. The active login now uses real email OTP; follow `REAL_OTP_SETUP.md`. The books catalog and routes remain the same.

## 1. Files created

- `src/config/academicResources.ts` — six editable branch definitions and two semesters.
- `src/data/demoAcademicResources.ts` — isolated, typed presentation catalog.
- `src/components/resources/books/BookDetailsModal.tsx` — accessible local details dialog.
- `tests/prototype-books.test.mjs` — 12 additional prototype checks covering the requested behaviors.
- `REFERENCE_BOOKS_PROTOTYPE_REPORT.md` — this report.

## 2. Files modified

- `src/types/referenceBooks.ts` — optional Reference Book category.
- `src/config/referenceBooks.ts` — select prototype data using `DEMO_MODE`, including built previews.
- `src/lib/branchPreference.ts` — separate validated demo branch preference.
- `src/lib/referenceBooks.ts` — clickable parent breadcrumbs without a P1 branch label.
- `src/pages/ReferenceBooksPage.tsx` — remembered branch, Change action, academic context and prototype content.
- `src/components/resources/books/BranchSelector.tsx` — branch short names and full names.
- `src/components/resources/books/SemesterSelector.tsx` — responsive semester grid.
- `src/components/resources/books/SubjectGrid.tsx` — sample book counts and branch preparation state.
- `src/components/resources/books/BookCoverPlaceholder.tsx` — CSS cover with subject name.
- `src/components/resources/books/BookCard.tsx` — local View Details action.
- `src/components/resources/books/BookList.tsx` — subject context and prototype layout.
- `src/components/resources/books/BooksSearchResults.tsx` — subject-aware covers and P1 result labels.
- `src/books.css` — responsive cards, selected branch summary and dialog styling.
- `tests/reference-books.test.mjs` — retain architecture coverage with explicit real-mode catalog selection and current prototype label.
- `README.md`, `REFERENCE_BOOKS_DATA_GUIDE.md`, `DEMO_MODE_GUIDE.md`, `QA.md` — current setup, data and verification documentation.

No dependencies were added. SHA-256 comparison against the start-of-task baseline confirmed all 19 monitored auth, profile, academic validation, dashboard/navigation, landing/style and SQL files unchanged. The existing Reference Books dashboard destination already pointed to `/resources/books`; no dashboard-card edit was needed.

## 3. Demo resource data structure

Existing strongly typed `ReferenceCatalog`, `Curriculum`, `Branch`, `Semester`, `Subject` and `ReferenceBook` types are reused. Subjects identify a curriculum and semester; books identify a subject. Arrays are readonly and no `any` was introduced. The catalog contains one common P1 curriculum, six E1 curricula, 30 subjects and 31 book records. Each curriculum exposes Semester 1 and Semester 2.

Branch names exist centrally in `academicResources.ts`; sample subjects and book metadata exist in `demoAcademicResources.ts`. All pages visibly identify the catalog as Prototype resources. The older generic catalog remains a regression-test fixture only.

`DEMO_MODE = true` selects this catalog for both `npm run dev` and production builds. Setting it false selects the separate confirmed-resource catalog and real authentication. The confirmed-resource catalog is still empty pending approved curriculum and resource data.

## 4. P1 flow

Landing → prototype login → dashboard → Reference Books → Semester 1 or 2 → subject → books → View Details.

The level comes directly from `profile.academicLevel`. P1 never asks for a branch or displays an E1 branch preference. Browser verification used **Student / ANYTHING / P1**, opened Physics and its details, and refreshed the subject URL successfully.

## 5. E1 flow

Landing → prototype login → dashboard → Reference Books → branch → semester → subject → books → View Details.

First visits offer CSE, ECE, EEE, ME, CE and CHE with the supplied full names. Browser verification used **Harsha / N240001 / E1**, then ECE → Semester 1 → Network Theory → Engineering Circuit Analysis details. The dashboard displayed the entered identity. The development server was also checked through CSE → Semester 2 → Probability & Statistics.

Routes retain `/resources/books/:level/:curriculumId/:semesterId/:subjectSlug`, such as `/resources/books/e1/ece/semester-1/network-theory`. Breadcrumbs and explicit back links navigate the hierarchy. Refresh retains the demo profile and destination. Invalid or cross-level resource paths show a recoverable Resource not found screen.

## 6. Branch persistence

E1 selections are stored under `pivot-sols-demo-branch`. Returning to Reference Books shows Selected Branch and semesters; Change opens the branch selector via `?choose=branch`. A valid deep link also updates the preference. Unknown stored values are ignored and unavailable storage does not crash the page. The preference is local to the browser/origin and remains a convenience across demo logouts; it never changes the profile's academic level.

Return navigation, full reload, Change and selection of a different branch were manually verified. Real-mode preferences retain their separate existing key.

## 7. Subjects added for the prototype

| Curriculum | Semester | Subjects |
| --- | --- | --- |
| P1 | 1 | Mathematics; Physics; Chemistry; English; Introduction to Computing |
| P1 | 2 | Mathematics II; Physics II; Basic Electrical Engineering; Programming Fundamentals; Engineering Drawing |
| CSE | 1 | C Programming; Data Structures; Digital Logic; Discrete Mathematics; Computer Organization |
| CSE | 2 | Algorithms; Object Oriented Programming; Database Management Systems; Operating Systems; Probability & Statistics |
| ECE | 1 | Network Theory; Electronic Devices; Engineering Mathematics; Electromagnetic Theory; C Programming |
| ECE | 2 | Analog Electronics; Digital Electronics; Signals and Systems; Electrical Machines; Probability & Random Processes |

EEE, Mechanical, Civil and Chemical have no invented subjects. Both semesters show “Resources for this branch are being prepared.” and “More subjects will be added soon.”

## 8. Demo books added

| Subject | Title | Author(s) |
| --- | --- | --- |
| Network Theory | Engineering Circuit Analysis | William H. Hayt |
| Network Theory | Network Analysis | M. E. Van Valkenburg |
| C Programming, CSE and ECE | The C Programming Language | Brian W. Kernighan; Dennis M. Ritchie |
| Electromagnetic Theory | Introduction to Electrodynamics | David J. Griffiths |

These four supplied titles create five placements. The other 26 subjects each contain one clearly named “[Subject] — Sample Reference” by “Sample Author,” with a presentation-only description. Total: 31 records. Subject cards derive their counts from the catalog.

All prototype books use CSS-generated PIVOT REFERENCE covers. No external cover fetches, resource URLs, PDFs or download actions were added.

## 9. Search implementation

Client-side search uses the current level and selected curriculum, semester or subject as its scope. Matching is case-insensitive across subject names/codes, book titles and authors. Matching a subject shows that subject and its books; matching an author/title filters its books. Search resets as the route changes and provides a clear action and no-results state. “Network” and “valkenburg” filtering were manually verified. No backend is involved.

## 10. Book-details implementation

View Details opens a native modal dialog with book title, author(s), category, subject and the exact availability text: “Resource link will be added in the full version of Pivot Sols.”

The dialog has an accessible title/description, initial focus, Tab and Shift+Tab containment, Escape dismissal, X and Close buttons, backdrop dismissal and trigger-focus restoration. Background scrolling is locked while open. Keyboard containment, close controls, Escape focus restoration and backdrop dismissal were checked in the browser. Long titles wrap and short screens scroll inside the dialog.

## 11. Responsive behavior

The existing dark student-shell theme, fonts and navigation are reused. Content remains capped at roughly 1200px. Large screens show three branch columns, two semester columns, two to three subject columns and two book columns. Narrow screens use one column, wrapping breadcrumbs and card text.

Layout checks covered 320, 375, 430, 768, 1024, 1280, 1440 and 1920 CSS-pixel widths without horizontal document overflow. Screenshots verified branch cards, book cards, long sample titles and details at narrow sizes. Mobile book actions and the footer clear the existing bottom navigation. A 320 × 640 modal remains within the viewport and scrolls vertically. Temporary viewport overrides were reset after testing.

## 12. Tests result

Final `npm test`: **73 passed, 0 failed, 0 skipped**. All 61 prior tests remain, with 12 additional prototype tests. Together they cover P1 branch skipping, E1 branch choices and persistence, semester routes, ECE/CSE subject data, four branch empty states, book lists and modal metadata, scoped search, invalid paths, dashboard destination and demo-profile compatibility. Existing authentication, route guard, SQL/RLS, dashboard and landing tests pass.

Manual testing adds interaction coverage beyond static markup assertions: both required complete login flows, modal opening/closing and keyboard behavior, search, branch return/change, direct refresh, narrow layouts and a development-mode CSE flow. No browser console errors or warnings were observed in either tested preview. Live Supabase authentication was not exercised; its source was preserved and existing automated real-mode checks pass.

## 13. Build result

After the final test run, `npm run build` passed TypeScript and Vite with no warnings. Vite transformed 2,118 modules. Main JavaScript: 448.14 kB (142.57 kB gzip); CSS: 62.02 kB (13.20 kB gzip). The built preview runs at `http://127.0.0.1:5182/` for this session. Development mode was separately verified using `npm run dev -- --host 127.0.0.1 --port 5183 --strictPort`.

This phase ends at Reference Books. Other resource destinations retain their existing placeholders.
