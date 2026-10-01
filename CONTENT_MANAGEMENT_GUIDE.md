# Pivot Sols content management

PostgreSQL is the source of truth for student resources. Use [the admin panel](http://localhost:5173/admin/login) to edit content; changing local TypeScript seed files does not change the running website. Setup: [ADMIN_SETUP.md](./ADMIN_SETUP.md), [DATABASE_SETUP.md](./DATABASE_SETUP.md).

## Publishing workflow

1. Open the appropriate section and choose **Add**, or **Edit** an existing record.
2. Enter its content using the labeled fields, selectors and repeatable lists. No raw JSON or iframe HTML is needed.
3. Keep **Draft** while preparing content. A name/title, slug where applicable and a valid parent are required even for a draft.
4. Use **Preview** to inspect saved or unsaved content inside the authenticated admin area.
5. Choose **Published** and save, or use **Publish** in the list once required fields and published parents are available.
6. Open the student website and refresh or navigate to the section. It fetches published database content; global search uses that same snapshot.

Draft and archived content never appears in student APIs. A published child also stays hidden if any ancestor is hidden. Unpublishing or archiving a parent is blocked while it has published children. The confirmation dialog reports dependencies; work from children toward parents. Archiving is reversible: edit and publish again when appropriate. Records are not permanently deleted.

The lists offer text/status filters and branch/semester filters for academic content. Use sort order to control display order. Simultaneous edits return a conflict instead of silently overwriting a newer version; reload the editor before saving again.

## Academics and books

Create content in this order: **Branch → Semester → Subject → Reference Book**. P1 semesters have no branch; E1 semesters belong to a branch. The branch slug `common` is reserved for P1. Semester numbers must be unique in their level/branch scope. Subject and lab slugs are unique within the selected semester.

A book editor lets you select level, branch, semester and subject, then enter title, repeatable authors, category, edition, publisher, description, resource URL and availability. Publishing requires authors and category. **Available** requires a lawful HTTPS resource link. **Coming soon** keeps the book metadata visible while withholding a resource link.

Student Books preserves the existing hierarchy and book-details dialog. P1 paths include `/resources/books/p1/common/semester-1/<subject-slug>`; E1 uses `/resources/books/e1/<branch-slug>/semester-1/<subject-slug>`. The student profile selects P1 or E1 automatically.

## Labs, experiments and videos

Create a semester, then a lab, then its experiments. Select academic placement in the editor. Supply title/slug, optional number, objective, apparatus, theory, ordered procedure, expected result and precautions. These guide sections are required before publishing an experiment. Use the add/remove controls for apparatus, procedure and precautions; their order is preserved.

Choose YouTube, MP4 or External and paste an HTTPS URL. YouTube watch, share, shorts and embed links normalize to a validated video ID; students see the existing privacy-enhanced player. MP4 links must point to a `.mp4` path. External links open safely in a separate tab. Arbitrary HTML and unsafe URL schemes are rejected. No file-upload or media-hosting system is included.

Video is optional. Without a configured video, the written guide remains available with an explicit coming-soon state. Only use videos you have reviewed for relevance and permission. Students may need internet access and the provider must allow embedding.

P1 Lab paths omit a branch: `/resources/labs/p1/semester-1/<lab-slug>/<experiment-slug>`. E1 uses `/resources/labs/e1/<branch-slug>/semester-1/<lab-slug>/<experiment-slug>`.

## Careers and branches

Career Domains includes name, slug, category, short summary, overview, activities, core/supporting skills, subjects, tools, technologies, interests, challenges, learning levels and repeatable roadmap stages. Career Jobs manages role guides with a real parent-domain relationship, responsibilities, skills, subjects, tools, technologies, roadmap, interview topics and projects. Publish the domain before its roles.

The domain shows its own roles automatically; additional related roles can be selected explicitly. Branch editors link published domain/role guides and provide an overview and major areas. Relations pointing to unpublished guides stay absent from student responses.

Use **Low**, **Moderate** or **High** for programming/mathematics learning needs. Career guides are learning content, not vacancies, eligibility decisions, rankings or placement guarantees. Keep descriptions clear and useful for beginners.

## About and Explore

Open **Site Content** and edit the existing About or Explore record. Their keys are unique; normally update the existing row rather than adding a duplicate.

About supports its title, eyebrow, introduction, reasons, headings and goal. Explore supports its title, introduction, section headings and up to four cards pointing to the existing Books, Labs, Domains and Jobs destinations. No arbitrary HTML or executable content is accepted. Navigation structure and resource-finder behavior remain part of the application.

## Preview, refresh and outages

Private previews require the admin session and can show drafts. Published records also offer a link to the applicable student route; the separate student login and P1/E1 level still apply there. Admin previews never make drafts public.

Content refreshes on route changes or window focus once the snapshot is older than ten seconds. Saves trigger an immediate refresh in the same browser tab. Other open tabs can be refreshed to see changes immediately. On API failure the student UI shows **We couldn't load this content** and **Try Again**; it clears cached content rather than silently substituting local samples.

## Imported content and scope

The initial database import preserves 6 branches, 14 semesters, 30 subjects, 31 books, 18 labs, 30 experiment placements, 16 domains, 24 roles, About and Explore. This remains prototype educational material and should be reviewed before an official launch. Local data files and the older Books/Labs data guides remain historical seed references, not instructions for updating the live site.

Student OTP, contact email, profile and landing-page behavior retain their existing implementation. SMTP recipients and credentials are server configuration, not CMS content. This phase does not add user management, file upload, public deployment or permanent deletion.
