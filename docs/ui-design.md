# Selected UI specification

Reference: user-selected 1536 × 1024 Study Companion Today screen (option 03).

- Cream #F7F2E8 background; coffee #3D3833 type; lavender #C9C2D9 selection and task band; peach #F2A68F main action. Green/yellow/blue are small semantic accents only.
- Desktop: 236px sidebar; main inset 56px left / 40px right / 56px top. Today heading 44px, subtitle 24px; 48px gap before task region. Left task : right rail roughly 1.87 : 1 with 32px gap.
- Sidebar: text brand, six outline navigation items, lavender active row; help and language at bottom. Icons use a consistent 24px viewBox and 1.6px currentColor strokes.
- Main task: 16px radius, warm hairline border, tinted header 104px; task heading 38px, amount control 64px high; peach completion button 96px high. Skip beneath. No permanent explanatory paragraphs.
- Right rail: recommended/optional in one panel; separate mood/notes disclosure; close-day button below a divider. Keep secondary actions accessible.
- Default visible copy: brand; six navigation labels; Today title; supportive subtitle; minimum/recommended/optional labels; real task title/ amount/unit; mark complete; skip; mood and notes; finish; help; language.
- Real data replaces reference demo values. Multiple minimum tasks stack; completed/partial/skipped/closed and no-task states retain all existing operations and semantics. Existing health/phrase gates remain on Home.
- At narrower widths the secondary rail moves below the main task. Mobile uses the same palette, one column, compact controls and six-item bottom navigation. No new features, tracking, backend, storage schema or scheduling logic.
- Help opens a keyboard-accessible native dialog containing the original guidance, task descriptions and current plan explanation. Correct the reference's malformed help label to 使用帮助. Other routes inherit the same typography, palette and controls.

Intentional differences: browser-native typography and input rendering; responsive reflow; dynamic task data; accessible focus rings; necessary completion/empty states; correct help label. No raster screenshot UI.

## Verification — 2026-08-28

- `npm test`: 24 tests passed across 3 files (15 existing algorithm/i18n tests and 9 presentation regressions).
- `npm run build`: TypeScript and Vite production build passed. No new dependencies.
- UI-only tests on isolated localhost data: cycle/goal creation and health/launch gates; partial amount persistence; complete/undo; checkbox; skip/restore; recommended/optional disclosure actions; help Escape/focus restoration; mood/notes/blockers; close-day lock; history/review; JSON import/export. Exported JSON retained version 1 and one check-in.
- Chromium responsive checks: all six navigation pages at 320px and 390px without horizontal overflow; translated Today controls; multiple minimum tasks, long unbroken titles, mixed units, empty plans and secondary-only plans.
- Scheduler, progress calculations, storage/types and dependency manifests unchanged. Test fixtures were not added to the app or sent to production.

### Reference fidelity ledger

Compared the selected image and real browser screenshots at 1536 × 1024.

| Element | Reference | Implemented / decision |
| --- | --- | --- |
| Sidebar | 236px, six outline links, utilities below | 236px; same structure, native SVG strokes |
| Main task origin | about x292 / y200 | x292 / y200.19 |
| Primary task width | about 763px | 763.63px; 32px rail gap |
| Task header | lavender tint, 104px | 104px, palette-derived tint |
| Primary action | peach, about y635 / 96px high | y634 / 96px high |
| Secondary rail | two task rows, mood disclosure, separated finish button | same hierarchy; real quantities, disclosure contents retained |
| Typography and copy | Chinese title, short support line, help-label artifact | system font rendering; correct 使用帮助; real data and translated states |
| Mobile | not supplied | one column and fixed six-item navigation, safe bottom padding |

Browser-native fonts and input spinners differ from the raster concept. Main action width differs slightly because the implementation uses symmetric padding. Screenshots are visual checks, not a claim of pixel identity. Built-in browser screenshot scaling was unreliable; independent Playwright Chromium was used for final visual inspection. Safari and physical mobile devices were not tested.
