# Dashboard UI phase

Implemented the student dashboard and shared navigation in the existing React/Vite project. No dependencies were added. Authentication, profile resolution, student-ID/batch calculations, Supabase configuration, ProtectedRoute, SQL migrations and landing/auth page sources were preserved.

## Created files

- `src/lib/studentDisplay.ts`
- `src/config/studentNavigation.ts`
- `src/dashboard.css`
- `src/components/dashboard/AppShell.tsx`
- `src/components/dashboard/DesktopSidebar.tsx`
- `src/components/dashboard/MobileBottomNav.tsx`
- `src/components/dashboard/DashboardHeader.tsx`
- `src/components/dashboard/InitialsAvatar.tsx`
- `src/components/dashboard/ProfileMenu.tsx`
- `src/components/dashboard/SearchModal.tsx`
- `src/components/dashboard/ResourceCard.tsx`
- `src/components/dashboard/StudentContext.tsx`
- `src/components/dashboard/PlaceholderContent.tsx`
- `src/components/dashboard/ProfileLoadError.tsx`
- `src/pages/ResourcePlaceholderPage.tsx`
- `src/pages/BranchesPage.tsx`
- `src/pages/AboutPage.tsx`
- `src/pages/ContactPage.tsx`
- `tests/dashboard-ui.test.mjs`
- `DASHBOARD_PHASE_REPORT.md`

## Modified files

- `src/App.tsx`: nested student routes in the existing protected route and shared shell.
- `src/main.tsx`: imports scoped dashboard CSS.
- `src/components/common/StudentShell.tsx`: connects the existing profile/loading/refresh state and unchanged LogoutButton to AppShell.
- `src/components/common/RouteEffects.tsx`: titles for new routes; existing route scrolling retained.
- `src/pages/DashboardPage.tsx`: greeting, five resource cards and Your Pivot profile context.
- `src/pages/ProfilePage.tsx`: read-only profile details with existing logout.
- `README.md`, `QA.md`: updated feature and verification documentation.

## Routes and placeholders

Eight new protected routes use the persistent student shell:

| Route | Page |
| --- | --- |
| `/resources/books` | Reference Books |
| `/resources/labs` | Lab Videos |
| `/careers/domains` | Career Domains |
| `/careers/jobs` | Career Jobs |
| `/explore` | Explore |
| `/branches` | All Branches |
| `/about` | About Pivot Sols |
| `/contact` | Contact Pivot Sols |

The five resource pages show an icon, description, “Content coming in the next phase.” and dashboard navigation. Branches has no invented content. About uses the supplied purpose and goal. Contact shows name, institutional email and message fields with disabled Coming soon submission. Existing `/dashboard` and `/profile` are improved; landing, signup, login, callback, profile completion and NotFound routes remain.

## Components and navigation

AppShell owns the shared responsive header, sidebar, bottom navigation and content transition. DesktopSidebar is fixed at 244px from 1024px upward, with active Home/All Branches/About/Contact links and a bottom Profile summary. Below 1024px, a compact header and fixed bottom navigation show exactly Home, Branches, About, Contact and Profile. Safe-area padding and extra page-bottom space keep content accessible. Resource cards use two columns on tablet/desktop, one column on phones, with Explore spanning the desktop row.

SearchModal is a native dialog with autofocus, keyboard focus containment, focus restoration, scroll locking and X/Escape/backdrop dismissal. It has no results or API requests. ProfileMenu supports keyboard navigation, Escape and outside dismissal, and reuses the original LogoutButton. Route transitions affect content only and respect reduced motion. Semantic navigation, aria-current and visible keyboard focus are provided.

## Authenticated profile usage

StudentShell and page wrappers obtain the existing `useAuth().profile`. The greeting uses `profile.name` and the local device hour; initials derive from the same name. The sidebar, dropdown, Your Pivot section and profile page use `studentId`, `academicLevel`, `campus` and `email` from that profile. Identity fields are read-only. Existing branded loading and a retryable unexpected missing-profile state prevent empty identity rendering. No mock session or hardcoded production student was introduced.

## Verification

- `npm test`: 40 passing tests, including all 33 existing tests and seven dashboard checks for greeting boundaries, initials, profile rendering, card destinations, exact mobile links/active state, placeholders, read-only/disabled controls and protected shell routing.
- `npm run build`: TypeScript checks and Vite production build pass with no build warnings.
- Browser layout checks at 320, 375, 430, 768, 1024, 1280, 1440 and 1920 CSS pixels: no horizontal overflow on dashboard, profile, contact, branches and about; responsive card columns, desktop sidebar and five mobile links fit. Bottom content remains above navigation. Profile dropdown and search modal fit narrow screens.
- Browser interactions: all five cards, desktop links, mobile links, profile dropdown and search dismissal/focus behavior pass. No console errors or warnings observed.
- Direct unauthenticated visits to all ten student routes resolve to `/login`; reloading the resulting login route works. Existing SPA fallback configuration is retained.
- Browser rendering of student pages used a temporary component-only test harness with isolated fixture props. The harness was removed after QA. Application route protection was never bypassed.

Live verified sign-in, authenticated deep-link refresh and live logout could not be exercised without Supabase credentials. Existing automated auth wiring/profile/route-gate tests pass, and real logout is reused unchanged; live acceptance still requires the setup in `SUPABASE_SETUP.md`.

This phase stops at dashboard UI and placeholders. No resource datasets, announcements, analytics, admin features, backend search or contact backend were added.
