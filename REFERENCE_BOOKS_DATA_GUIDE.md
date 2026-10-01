# Adding Reference Books data

The books UI reads local typed configuration. Page components do not need to change when resources are added. The current working prototype uses the supplied presentation subjects and branch options, clearly labelled as demo content. These are not an authoritative RGUKT curriculum.

## Structure

- `src/types/referenceBooks.ts`: Curriculum, Branch, Semester, Subject, ReferenceBook and ReferenceCatalog.
- `src/data/academics/curricula.ts`: structural configuration. P1 has an empty common curriculum; E1 awaits confirmed branches.
- `src/data/academics/p1/subjects.ts` and `books.ts`: P1 data.
- `src/data/academics/e1/subjects.ts` and `books.ts`: E1 aggregators. Add separate branch directories as real data grows, then import/spread their arrays here.
- `src/data/academics/productionReferenceBooks.ts`: joins production data.
- `src/config/academicResources.ts`: the six editable prototype branches and two semesters.
- `src/data/demoAcademicResources.ts`: the current presentation catalog: 30 subjects and 31 book records.
- `src/data/academics/demoReferenceBooks.ts`: older generic fixture retained only for architecture regression tests; not selected by the app.

## Edit the prototype

Edit branch display names, short names and IDs in `academicResources.ts`. Keep existing IDs stable to preserve bookmarks. Edit the P1, CSE and ECE subject arrays and supplied reference metadata in `demoAcademicResources.ts`. Subject IDs combine curriculum, semester and a name-derived slug, so renaming a subject currently changes its URL.

P1 has five subjects in each semester and no branch. CSE and ECE each have five subjects per semester. EEE, Mechanical, Civil and Chemical have both semester choices with the preparation empty state. Network Theory has two supplied references; C Programming in both branches and Electromagnetic Theory have the other supplied titles. The remaining 26 subjects each have explicit Sample Reference / Sample Author metadata. All prototype records omit resource and cover URLs. Their View Details button opens a local modal with author, category, subject and availability. CSS covers show PIVOT REFERENCE and the subject name.

## Add a branch and semester

In `curricula.ts`, add a Curriculum with a globally unique stable lowercase hyphenated `id`, `level: 'E1'`, and a `branch` containing the supplied `id`, `name` and optional `shortName`. Add its confirmed semesters to the `semesters` array, each with stable `id`, display `name` and optional numeric `number`. Keep IDs globally unique across curricula; semester IDs need only be unique within a curriculum. Do not rename IDs after sharing bookmarks.

For P1, add confirmed semesters to the existing `common` curriculum. No branch selection is shown when a level has one common curriculum. Future branch-specific P1 data can be added as additional curricula.

## Add subjects

Add Subject records to the relevant subjects file. Each needs a globally unique `id`, its `curriculumId`, an existing `semesterId`, its supplied `name`, and a lowercase hyphenated `slug`. Slugs must be unique within each curriculum/semester. Include `code` only when supplied. The subject card derives its book count from actual configured records.

## Add books and resources

Each ReferenceBook needs a globally unique `id`, the existing `subjectId`, a supplied `title` and an `authors` array. Optional metadata: `edition`, `publisher`, `description`, `coverUrl`, `resourceUrl` and `sourceType` (`official`, `library`, `external`, `uploaded`). Omit unknown fields instead of inventing them. `uploaded` is only a metadata label; there is no upload or file-hosting feature.

Use a legitimate publisher page, institutional library/catalog, open educational resource, authorized file or instructor-provided reference URL. HTTPS and root-relative supplied local assets are supported; executable/data/protocol-relative URLs are rejected. Links open a new tab with `noopener noreferrer`. Do not assume every reference is a PDF.

Omit `resourceUrl` until an approved link is available. The card then displays Resource coming soon. Do not insert `#` or fake links. Put supplied cover images under `public/resources/covers/` and use `/resources/covers/filename.webp`. Without a cover, the interface renders a CSS book placeholder; failed images also fall back to it. No external cover API is used.

## Demo and production

`src/config/referenceBooks.ts` follows `DEMO_MODE` from `src/config/demo.ts`. With the current value `true`, both `npm run dev` and built previews select the working prototype catalog. Set `DEMO_MODE = false` and rebuild to select the separate confirmed-data catalog and real authentication. The confirmed-data catalog is currently empty and displays honest empty states. Switching authentication mode therefore also switches resource data; a production build with demo mode enabled remains a prototype.

Run `npm test` and `npm run build` after adding data. Check unique IDs, matching curriculum/semester/subject references, safe links, display labels and both academic levels before publishing. Real links and cover permissions must come from the supplied source owners; the app does not verify their provenance automatically.

## Navigation and implementation

Root: `/resources/books`. Nested routes: `/resources/books/:level/:curriculumId`, then `/:semesterId`, then `/:subjectSlug`. Levels in URLs are lowercase `p1` or `e1`; browsing is limited to `profile.academicLevel`. Invalid, extra or cross-level route segments show Resource not found. P1 skips branch selection. E1 initially offers six branches, then remembers the selection in `pivot-sols-demo-branch`. Returning to books shows Selected Branch, Change and semesters. Change opens `/resources/books?choose=branch`. Real-mode preferences retain the separate `pivot-sols-selected-branch` key. Preferences never change student identity, and storage failures do not crash navigation.

Search uses currently configured subject names/codes, book titles and authors, scoped to the current level and any selected curriculum, semester or subject. There is no backend search. Breadcrumbs and explicit back links navigate the hierarchy. All screens reuse the existing student shell and its responsive navigation.

The implementation files are `src/pages/ReferenceBooksPage.tsx`, `src/lib/referenceBooks.ts`, `src/lib/branchPreference.ts`, `src/books.css` and reusable components under `src/components/resources/books/`, including the new `BookDetailsModal`. The existing route registration, document titles and shell remain in use. `tests/reference-books.test.mjs` preserves the 12 architecture checks; `tests/prototype-books.test.mjs` adds 12 checks for the working prototype. No additional package was installed.

Both supplied login-to-books flows were checked in the built app with actual demo sessions. See `REFERENCE_BOOKS_PROTOTYPE_REPORT.md` and the latest section of `QA.md` for current verification. Remaining real-data acceptance needs confirmed RGUKT curriculum and resource lists.

Next supply: approved P1 common/E1 branch configuration, semester names, subject names and optional codes, book titles/authors/editions/publishers, legitimate resource links and any supplied cover files. Lab Videos and career content remain untouched.
