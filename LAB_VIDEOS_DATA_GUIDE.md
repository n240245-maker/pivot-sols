# Updating Lab Videos

Lab Videos uses the signed-in student's `profile.academicLevel`. Content is local TypeScript data; no database, upload service or API is required.

## Files to edit

| File | Purpose |
| --- | --- |
| `src/data/demoLabResources.ts` | Clearly labelled presentation labs and sample guides |
| `src/data/labVideos/productionLabResources.ts` | Empty catalogue reserved for confirmed curricula and reviewed content |
| `src/types/labVideos.ts` | `LabCatalog`, `Lab` and `LabExperiment` field definitions |
| `src/config/labVideos.ts` | Selects the catalogue; currently follows the existing presentation mode |
| `src/config/academicResources.ts` | Existing shared prototype branch and semester definitions |
| `src/components/resources/labs/LabVideo.tsx` | Reusable video player and missing-video state |
| `src/lib/labVideoSource.ts` | Video URL validation |

Keep curriculum and experiment content in the data files, outside page components. The prototype is not an official RGUKT syllabus. Have the academic team review names, semester mapping, practical instructions and media before publishing real content.

## Add a lab

1. Find the correct curriculum and semester in the catalogue's `curricula` array. The current P1 curriculum ID is `common` internally; P1 URLs never include that ID. E1 IDs are `ece`, `cse`, `eee`, `mechanical`, `civil` and `chemical`.
2. Add an item to `labs` with a globally unique `id`, matching `curriculumId` and `semesterId`, a readable `name`, a URL `slug`, an optional `shortDescription` and an `experiments` array.
3. In the demo file, the small `lab(...)` helper supplies IDs and semester IDs. For example:

```ts
lab('ece', 1, 'network-theory-lab', 'Network Theory Lab',
  'Explore circuit equivalents and transient responses.', networkExperiments)
```

Slugs use lowercase letters/numbers separated by hyphens. A lab slug must be unique within its curriculum and semester. Keep published slugs stable so saved links work. Leave `experiments: []` when no guide is ready; the UI shows a preparation state and an accurate count of zero.

## Add an experiment and guide

Add an object to a lab's `experiments` array. Its ID and slug must be unique within that lab. The following is a structure example; replace its text with reviewed instructions:

```ts
{
  id: 'measurement',
  slug: 'measurement',
  title: 'Measurement',
  experimentNumber: 1,
  objective: 'Explain what the student will verify or measure.',
  apparatus: ['List the required instrument', 'List the components'],
  theory: 'A concise explanation of the principle being observed.',
  procedure: [
    'Describe the first approved step.',
    'Describe the next step, including what to record.',
  ],
  expectedResult: 'Describe the expected observation and acceptable limitations.',
  precautions: ['List a relevant handling or measurement precaution.'],
}
```

- **Objective:** one focused learning outcome.
- **Apparatus:** an array of equipment names, rendered as a list.
- **Theory:** a short plain-text explanation.
- **Procedure:** one step per array item; numbering is automatic.
- **Expected result:** plain text displayed in a restrained highlighted panel.
- **Precautions:** one item per array entry, displayed with a subtle shield icon.
- **Experiment number:** optional. Omit it when there is no approved sequence; the UI does not invent a number.

Omitted text fields and empty lists do not create empty sections. Text is rendered as text, never injected as HTML. `thumbnailUrl` is reserved metadata; the current player deliberately does not fetch thumbnails. `duration` is optional display text, such as `08:30`, on the YouTube load button.

## Add an approved video

No video links are supplied in the prototype. Leave `videoUrl` and `videoType` out until you have an approved source. The page will display **Video coming soon** and retain the available guide.

### YouTube

Set `videoType: 'youtube'` and `videoUrl` to the approved HTTPS watch/share/embed URL. For example, use the real URL copied from your institution's approved video, not a placeholder ID. Supported forms include `youtube.com/watch?v=…`, `youtu.be/…`, `/embed/…` and `/shorts/…` on the expected YouTube hosts.

The renderer extracts an 11-character video identifier, rejects unexpected hosts or identifiers and constructs its own `www.youtube-nocookie.com` URL. Extra input query parameters are not passed to the iframe. A **Load video** button delays the YouTube connection until the student chooses it; there is no autoplay. The privacy-enhanced embed follows [YouTube's embedding guidance](https://support.google.com/youtube/answer/171780?hl=en). It still contacts YouTube once loaded. A visible source link remains available if the video owner disables embedding or the player cannot load.

### MP4

Set `videoType: 'mp4'` and `videoUrl` to an approved HTTPS URL whose pathname ends in `.mp4`, or a same-origin path such as `/videos/approved-experiment.mp4`. Supply the actual file in `public/videos/` only when you have the right to distribute it. No files are included by default.

The renderer uses native `<video controls playsInline preload="none">`, without autoplay or a download action. Verify the hosting server's content type, HTTPS access and range-request support, and check playback on target browsers. The player shows a fallback on media errors. Do not put secret credentials or private access tokens in frontend data.

### Other approved providers

Use `videoType: 'external'` with an approved HTTPS URL. Students receive a clearly labelled link that opens the provider in a new tab using `noopener noreferrer`. Arbitrary third-party pages are not embedded.

The type may be omitted for a recognizable YouTube URL or `.mp4` path, but setting it explicitly is clearer. Invalid or unsupported sources show **Video unavailable** without creating a broken player. Testing actual playback and captions requires the real videos; no demo video is assumed to be licensed or approved.

## Replace the prototype

1. Populate `productionLabResources.ts` with confirmed curricula, semester mappings, labs, reviewed experiment guides and approved video URLs; retain `demo: false` there.
2. Update only `src/config/labVideos.ts` to select that confirmed catalogue when ready. Do not toggle authentication or change SMTP to publish lab content.
3. Keep the prototype catalogue separate for presentation fixtures, or retire it after updating its fixture tests. Do not merely remove the prototype label from unreviewed samples.
4. Reuse the existing central branch configuration where appropriate; replace prototype branch/semester definitions with institution-confirmed configuration when available. Branch preferences are navigation hints, not academic records or access controls.
5. Run the checks below and review every changed deep link, title and empty state.

## Routes and checks

```text
/resources/labs
/resources/labs/p1
/resources/labs/p1/:semester/:labSlug/:experimentSlug
/resources/labs/e1/:branch
/resources/labs/e1/:branch/:semester/:labSlug/:experimentSlug
```

The semester, lab and experiment pages each work independently at their corresponding prefix. Root access detects P1/E1 from the existing authenticated profile. E1 reuses the Books branch preference and supports **Change**. P1 skips branches entirely.

```powershell
npm test
npm run build
cd backend
.\.venv\Scripts\python.exe -m pytest
```

Check both P1 and E1 sessions, deep-link refresh, search by lab and experiment, keyboard links and small screens. Keep your host's existing SPA fallback for browser-history routes. A configured route that has no resources should show an honest empty state; unknown or cross-level routes should show **Lab resource not found**.

## Content to collect next

For each real experiment, provide its academic level, branch if applicable, semester, lab name, experiment title/number, all reviewed guide sections, and its approved video URL/type. Include distribution permission, accessibility/caption information and optional duration. Also confirm the official lab/semester mapping and which currently empty labs should be populated first.
