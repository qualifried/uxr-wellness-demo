# Review inbox

Independent code-review inbox for the maintainer of this repository.
Reviewers append entries and do not edit or remove earlier ones.
The maintainer may add a disposition under each finding.

Delivery is branch-only. Handoff is pending until the maintainer confirms reading it.

Acknowledgements are appended below the marker. Reviewers must preserve the marker.

<!-- ACK-APPEND-ONLY -->

## Baseline review, main 003a7d0

Reviewed commit: `003a7d0f97c2ccc3e93865878047f9abc478452d` (`003a7d0`).

Proposal ids start at UWD-001. Ratios below use the WCAG 2 relative-luminance formula on the hex tokens. Headless Chrome 157 loaded `index.html` and confirmed the behaviors called out in the findings.

### Confirmed defects

#### UWD-001. View changes drop keyboard focus

`render()` replaces the phone and the presenter panel with `innerHTML` on every navigation and on most control clicks. The only focus restore is the participant field, and only when login failed. After a successful login, a tab change, or a presenter action, focus lands on `body`.

Evidence:

- https://github.com/qualifried/uxr-wellness-demo/blob/003a7d0f97c2ccc3e93865878047f9abc478452d/app.js#L881-L910
- https://github.com/qualifried/uxr-wellness-demo/blob/003a7d0f97c2ccc3e93865878047f9abc478452d/app.js#L1372-L1406

Severity: Medium. Confidence: High.

Why it matters: a keyboard user has to start from the top of the page after every screen. The new heading is not focused, so a screen reader is not moved to the screen that just opened. Headless check: activating the Nutrition tab left `document.activeElement` on `body`. A successful login did the same. An empty code left focus on `participant-code` and showed the empty-code error.

Minimal scope: after each `render()` that changes screen, move focus to that screen's `h1` (`tabindex="-1"`). Keep the existing focus of the code field on a failed login. HVAC steppers and the zone sliders already update in place and should keep doing that.

Tradeoffs: recreating the whole tree on every click makes "return focus to the same button" fragile, because the node is gone. Focusing the new heading is the smaller change. A later rewrite that patches the DOM would keep focus without this extra step.

Acceptance criteria and tests:

- Keyboard-activate a tab, a presenter jump, successful login, and Wellness Zone entry. Focus is on the new screen's heading, and the heading's accessible name matches that screen.
- Submit an empty participant code. Focus is on the code field and the error text is present.
- Press a seat-heat or temperature stepper. Focus stays on that button.

Disposition:

#### UWD-002. Zone sliders and the presenter switch have no accessible name

The intensity and brightness inputs sit next to a `<label>` that does not wrap them and has no `for`. The inputs have no `id` and no `aria-label`. The range rule sets `outline: none`, which beats the `input:focus-visible` ring. The presenter switch is an empty button: the visible words are a sibling span, not a label.

Evidence:

- https://github.com/qualifried/uxr-wellness-demo/blob/003a7d0f97c2ccc3e93865878047f9abc478452d/app.js#L739-L745
- https://github.com/qualifried/uxr-wellness-demo/blob/003a7d0f97c2ccc3e93865878047f9abc478452d/styles.css#L1493-L1501
- https://github.com/qualifried/uxr-wellness-demo/blob/003a7d0f97c2ccc3e93865878047f9abc478452d/styles.css#L51-L57
- https://github.com/qualifried/uxr-wellness-demo/blob/003a7d0f97c2ccc3e93865878047f9abc478452d/app.js#L847-L849

Severity: Medium. Confidence: High.

Why it matters: the zone sliders are part of the main cabin screen. A screen reader hears an unnamed slider. With focus on a range input, computed `outline-style` was `none` (Chrome 157). The switch exposes `aria-checked` and an empty name, so the presenter control is unnamed. Clicking the words beside it does not toggle it.

Minimal scope: give each range input an `id` and point the existing label's `for` at it. Delete the `outline: none` on the range, or restore the focus ring at equal or higher specificity. Give the switch an accessible name from the existing presenter string (`aria-labelledby` on the span, or wrap the span and button in a `<label>`).

Tradeoffs: a custom range thumb can lose the native focus ring if the outline is cleared. Keeping the ring and restyling the track is enough. Wrapping the switch in a label also makes the text clickable.

Acceptance criteria and tests:

- In the zone, each slider's accessible name is Intensity or Brightness, and keyboard focus draws a visible ring in light and dark.
- The presenter switch name is the simulator label, and `aria-checked` still flips when it is activated.
- Dragging a slider still updates its value without rebuilding the zone (see UWD-005).

Disposition:

#### UWD-003. Faint notes, the dark tab label, and the dark focus ring fail contrast

Default light theme uses `--text-faint` (`#96948c`) for `.tiny-note` and `.field-hint` at `--text-xs` (11px). On `--surface` (`#fffcf8`) that pair is 2.97:1. Dark faint `#7a7973` on `--surface` `#232321` is 3.61:1. Both are under 4.5:1 for 11px text. Those notes carry the simulated-data captions and the login hint.

In dark scheme the active tab label is `--pill-active-fg` `#f3f1ec` on an indicator that runs from `#8fa39a` to `#6d857c`. That is 2.36:1 at the start and 3.51:1 at the end, at 11px. Dark mood "bright" uses indicator start `#c0b093`, which is 1.88:1 against the same label color. Primary buttons already use `--text-on-accent` (`#161615`) on the light accent, which is 6.79:1.

`--focus-ring` is `2px solid #4a6a62` on `:root` and is not overridden for dark. Against `--surface` `#232321` it is 2.65:1. Against the dark page gradient start `#1c1c1a` it is 2.87:1. Both are under the 3:1 non-text threshold.

Evidence:

- https://github.com/qualifried/uxr-wellness-demo/blob/003a7d0f97c2ccc3e93865878047f9abc478452d/tokens.css#L157-L158
- https://github.com/qualifried/uxr-wellness-demo/blob/003a7d0f97c2ccc3e93865878047f9abc478452d/tokens.css#L166-L213
- https://github.com/qualifried/uxr-wellness-demo/blob/003a7d0f97c2ccc3e93865878047f9abc478452d/tokens.css#L215-L240
- https://github.com/qualifried/uxr-wellness-demo/blob/003a7d0f97c2ccc3e93865878047f9abc478452d/tokens.css#L356-L367
- https://github.com/qualifried/uxr-wellness-demo/blob/003a7d0f97c2ccc3e93865878047f9abc478452d/styles.css#L636-L638
- https://github.com/qualifried/uxr-wellness-demo/blob/003a7d0f97c2ccc3e93865878047f9abc478452d/styles.css#L481-L507
- https://github.com/qualifried/uxr-wellness-demo/blob/003a7d0f97c2ccc3e93865878047f9abc478452d/styles.css#L712-L715

Severity: Medium. Confidence: High.

Why it matters: the default theme's simulated-data notes are the caption that tells a stakeholder the health figures are fake, and they fail contrast. Switching the presenter control to Dark makes the only visible tab name fail, and the focus ring stays the light-scheme sage. Headless Chrome, after a layout flush, reported the dark active label as `rgb(243, 241, 236)` at 11px on `linear-gradient(135deg, rgb(143, 163, 154), rgb(109, 133, 124))`, the dark `.tiny-note` as `rgb(122, 121, 115)` at 11px, and a focused tab outline of `solid 2px rgb(74, 106, 98)`. Light `.tiny-note` computed to `rgb(150, 148, 140)`.

Minimal scope: raise `--text-faint` in both schemes until `.tiny-note` and `.field-hint` clear 4.5:1 on `--surface` and `--bg`. In dark, set the active pill label to the same dark-on-accent pairing the primary button already uses, including the dark mood overrides. Set `--focus-ring` inside `[data-scheme="dark"]` so the ring clears 3:1 on `--bg` and `--surface`.

Tradeoffs: faint text will look less quiet, including placeholders, because they share the token. Pointing `.tiny-note` and `.field-hint` at `--text-muted` (light 5.07:1, dark 6.15:1 on surface) is enough if placeholders should stay lighter. The pill fix should follow the button pairing per mood so Bright does not regress.

Acceptance criteria and tests:

- Recompute the pairs above. Faint note and field hint are at least 4.5:1 on surface and page background in light and dark. Active tab label is at least 4.5:1 on both gradient stops for every dark mood. Focus ring is at least 3:1 on `--bg` and `--surface` in dark.
- Light primary-button text, body text, muted card text, and the provisional tag stay at or above their current passing ratios.

Disposition:

#### UWD-004. The page font is inlined in CSS; the Pages decode writes a second copy nothing references

`tokens.css` embeds Outfit as a `data:` URI inside `@font-face` (font-display: swap). That file is 160342 bytes. The decoded font is 110572 bytes, so almost all of the render-blocking stylesheet is the font. `index.html` links `tokens.css` and `styles.css` from the head and loads `config.js` and `app.js` at the end of the body.

The workflow runs `base64 -d` into `fonts/Outfit-VariableFont_wght.ttf` and uploads the whole directory. No stylesheet `url()` points at that ttf. The data URI and the sidecar decode to the same font (`file` reports TrueType, sha256 `bccf9dda25ddc7fb32217f386e07c72c699a902eed3abcf5665ce4377fdfa33b`). A bad sidecar fails the step (`printf '!!!!' | base64 -d` exits 1), which stops the deploy before upload. The page does not need that file to render the font.

Evidence:

- https://github.com/qualifried/uxr-wellness-demo/blob/003a7d0f97c2ccc3e93865878047f9abc478452d/tokens.css#L8-L14
- https://github.com/qualifried/uxr-wellness-demo/blob/003a7d0f97c2ccc3e93865878047f9abc478452d/index.html#L9-L10
- https://github.com/qualifried/uxr-wellness-demo/blob/003a7d0f97c2ccc3e93865878047f9abc478452d/index.html#L23-L24
- https://github.com/qualifried/uxr-wellness-demo/blob/003a7d0f97c2ccc3e93865878047f9abc478452d/.github/workflows/pages.yml#L20-L30

Severity: Medium. Confidence: High.

Why it matters: first paint waits on a stylesheet that is mostly a font. The published artifact contains the inlined copy, the decoded ttf, and the base64 sidecar. A corrupt sidecar fails the only deploy even though the page font comes from the data URI. I did not run the GitHub Actions workflow.

Minimal scope: pick one source. Either delete the decode step and stop publishing the sidecar, keeping the data URI so `index.html` still opens offline, or point `@font-face` at the decoded file (a woff2 would be smaller), drop the data URI, and keep the decode. The uploaded tree should match the URLs the page requests.

Tradeoffs: the data URI is what makes a local open of `index.html` show Outfit without a decode step, which matches the README. A separate file lets the CSS parse without the font bytes and can be cached, and `font-display: swap` then does something. Keeping both costs the bytes and ties deploy success to an unused file.

Acceptance criteria and tests:

- The font bytes the browser uses are the bytes the workflow produces, and a failing decode is required only when the page requests that file.
- `tokens.css` is no longer dominated by a second copy of the same font.
- Opening the deployed page still shows Outfit, and the OFL notice stays with the font files.

Disposition:

#### UWD-005. Slider captions do not follow the live value

`handleInput` writes the new percentage into `[data-intensity-val]` and `[data-brightness-val]`. The seat caption and the light caption are given the same percentage only when the zone is rendered. Dragging does not re-render, so those captions stay on the old value.

Evidence:

- https://github.com/qualifried/uxr-wellness-demo/blob/003a7d0f97c2ccc3e93865878047f9abc478452d/app.js#L685-L687
- https://github.com/qualifried/uxr-wellness-demo/blob/003a7d0f97c2ccc3e93865878047f9abc478452d/app.js#L715-L731
- https://github.com/qualifried/uxr-wellness-demo/blob/003a7d0f97c2ccc3e93865878047f9abc478452d/app.js#L1482-L1495

Severity: Low. Confidence: High.

Why it matters: the zone shows the percentage twice. Headless check: setting intensity to 80 updated the slider label from 30% to 80% and left the seat caption at 30%. Setting brightness to 10 updated its slider label and left the light caption at 25%.

Minimal scope: in `handleInput`, update the caption text that repeats the percentage, or remove the percentage from the captions and keep it on the slider label. Do not call `render()` from the input handler.

Tradeoffs: a full re-render would refresh the captions and would also restart the zone animation and drop slider focus (UWD-001). Patching the two text nodes matches the temperature and fan steppers.

Acceptance criteria and tests:

- Drag intensity from its theme default to another value. The slider label and the seat caption show the same percentage, and focus stays on the slider.
- Drag brightness. The slider label, the light caption, and the orb opacity all follow.
- Start, stop, and theme buttons still rebuild the zone from state.

Disposition:

### Enhancements

#### UWD-006. Reduced motion freezes the zone canvas on the first frame

CSS durations go to 0ms under `prefers-reduced-motion`, and the breathe and light-orb animations are disabled. `startZoneAnim` draws one frame and does not schedule another when reduced motion is set. The intensity input updates a label and does not call `drawSeat`. Brightness still updates CSS variables, so the orb can change without a new frame.

Evidence:

- https://github.com/qualifried/uxr-wellness-demo/blob/003a7d0f97c2ccc3e93865878047f9abc478452d/app.js#L646-L651
- https://github.com/qualifried/uxr-wellness-demo/blob/003a7d0f97c2ccc3e93865878047f9abc478452d/app.js#L1056-L1068
- https://github.com/qualifried/uxr-wellness-demo/blob/003a7d0f97c2ccc3e93865878047f9abc478452d/app.js#L1482-L1495
- https://github.com/qualifried/uxr-wellness-demo/blob/003a7d0f97c2ccc3e93865878047f9abc478452d/styles.css#L1579-L1586
- https://github.com/qualifried/uxr-wellness-demo/blob/003a7d0f97c2ccc3e93865878047f9abc478452d/tokens.css#L465-L475

Severity: Low. Confidence: High.

Why it matters: with reduced motion on, the intensity slider's seat graphic stays at the value from the first frame. I did not run the page with `prefers-reduced-motion` set. This is from the source.

Minimal scope: on intensity input, if the zone canvas is on screen, draw one seat frame. Keep the loop from repeating when reduced motion is requested.

Tradeoffs: one extra draw on input is still reduced motion. Restarting the animation loop would undo the preference.

Acceptance criteria and tests:

- With `prefers-reduced-motion: reduce`, open the zone, drag intensity, and confirm the seat graphic matches the new value and that no repeating animation is running.
- With the preference off, the zone graphic still animates while running and stops when Stop is pressed.

Disposition:

### Checked, not raised

- Participant code is escaped at the input value and in the home subtitle. A markup string submitted as the code was stored as text (`&lt;` in the HTML). The phone contained no injected `img` or `svg` from that string. Icon SVG comes from `config.js`, not from typed input.
- `config.js` sample data (the `sample` object) is labeled simulated. It has no name, contact, or identifier fields. Nothing in the repo reads like a real person's health record.
- Login: whitespace-only code stays logged out, shows the empty-code error, and focuses the field. A non-empty code opens Home.
- Layout D Health, then presenter layout B2, lands on Home, hides the Health tab, and shows the folded vitals block. Immersive zone Exit returns to Mind & Sleep and stops the zone. The B2 Wellness tab opens the zone stopped. The Mind & Sleep door and presenter jump start it. Breathing "Start session" opens a running session.
- The Nutrition tab label measured 43px inside a 64px max and was not clipped. `.pill-nav[hidden]` and `.sim-badge[hidden]` set `display: none`.
- README matches the demo: open `index.html` or the Pages site; visuals provisional; data simulated. Local open works because the font is in the stylesheet.
- Workflow token permissions are `contents: read`, `pages: write`, and `id-token: write`. Concurrency group is `pages` with `cancel-in-progress: false`. The four actions are major-version tags, not commit SHAs. I am not filing that.
- `fonts/OFL.txt` is the SIL Open Font License notice for Outfit. I read it. I did not read the base64 text; I decoded it.
- `node --check app.js` and `node --check config.js` exited 0 on Node v22.23.4. I did not run the Pages workflow.

### Coverage

- Fully read: `index.html`, `app.js` (1575 lines), `config.js`, `README.md`, `.github/workflows/pages.yml`, `.nojekyll`, `styles.css` (1586 lines), `favicon.svg`, `fonts/OFL.txt`.
- `tokens.css`: every line except the base64 payload on the `@font-face` `src` line. That payload was base64-decoded and identified with `file`.
- Skipped as text: `fonts/Outfit-VariableFont_wght.ttf.base64` (decoded, not read as text).
