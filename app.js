/* app.js
 * Stakeholder demo logic. Reads layout/nav/copy from config.js and
 * visual tokens from CSS variables (tokens.css). Sample data is fake.
 */
(function () {
  "use strict";

  const C = window.UXR_CONFIG;
  const rootEl = document.documentElement;

  const state = {
    authed: false,
    participantCode: "",
    layout: C.defaultLayout,
    tab: "home",
    screen: "login",
    scheme: C.defaultScheme,
    mood: C.defaultMood,
    simulator: false,
    zoneTheme: C.defaultZoneTheme,
    zoneRunning: false,
    zoneIntensity: themeById(C.defaultZoneTheme).defaultIntensity,
    zoneBrightness: themeById(C.defaultZoneTheme).defaultBrightness,
    hvacTempC: themeById(C.defaultZoneTheme).hvacTempC,
    hvacFanLevel: themeById(C.defaultZoneTheme).hvacFanLevel,
    seatHeatLevel: themeById(C.defaultZoneTheme).seatHeatLevel,
    tempUnit: C.defaultTempUnit || "C",
    loginError: "",
    breatheRunning: false,
  };

  let animFrame = 0;
  let clockTimer = 0;

  function themeById(id) {
    return C.zoneThemes.find((t) => t.id === id) || C.zoneThemes[0];
  }

  function layoutCfg() {
    return C.layouts[state.layout];
  }

  function tabCfg(id) {
    return C.tabs[id];
  }

  function visibleTabs() {
    return layoutCfg().tabs.map(tabCfg);
  }

  function icon(name, extraClass) {
    const path = C.icons[name] || "";
    return `<svg viewBox="0 0 24 24" aria-hidden="true"${
      extraClass ? ` class="${extraClass}"` : ""
    }>${path}</svg>`;
  }

  function token(name, el) {
    return getComputedStyle(el || rootEl).getPropertyValue(name).trim();
  }

  function tokenPx(name, el) {
    const v = token(name, el);
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }

  function cssColor(name, el) {
    const raw = token(name, el);
    if (!raw) return "#888";
    const probe = document.createElement("span");
    probe.style.color = raw;
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    (el || document.body).appendChild(probe);
    const out = getComputedStyle(probe).color;
    probe.remove();
    return out;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatSleep() {
    const s = C.sample;
    return `${s.sleepHours}h ${String(s.sleepMinutes).padStart(2, "0")}m`;
  }

  function formatSteps(n) {
    return Number(n).toLocaleString("en-US");
  }

  function clockTime() {
    return new Date().toLocaleTimeString("en-US", {
      timeZone: "America/Detroit",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  function applyDocumentTheme() {
    rootEl.setAttribute("data-scheme", state.scheme);
    rootEl.setAttribute("data-mood", state.mood);
    rootEl.style.colorScheme = state.scheme;
  }

  function provisionalTag() {
    return `<span class="provisional-tag">${escapeHtml(C.provisionalLabel)}</span>`;
  }

  function statusBar(opts) {
    const light = opts && opts.lightFg;
    return `
      <div class="speaker-bar" aria-hidden="true"></div>
      <div class="status-bar"${light ? ' style="color: var(--zone-fg)"' : ""}>
        <div class="time" data-clock>${escapeHtml(clockTime())}</div>
        <div class="status-icons" aria-hidden="true">
          ${icon("signal")}
          ${icon("wifi")}
          ${icon("battery")}
        </div>
      </div>
      <div class="sim-badge" ${state.simulator ? "" : "hidden"}>${escapeHtml(
        C.simulatorBadge
      )}</div>
    `;
  }

  function homeIndicator() {
    return `<div class="home-indicator" aria-hidden="true"><span></span></div>`;
  }

  function pillNav() {
    if (!state.authed || isImmersiveZone()) return `<nav class="pill-nav" hidden></nav>`;
    const tabs = visibleTabs();
    const items = tabs
      .map((t) => {
        const on = t.id === state.tab;
        const label = t.shortLabel || t.label;
        return `
          <button type="button" class="pill-item${on ? " is-active" : ""}"
            data-action="tab" data-tab="${t.id}"
            aria-current="${on ? "page" : "false"}"
            aria-label="${escapeHtml(t.label)}">
            ${icon(t.icon)}
            <span class="pill-label">${escapeHtml(label)}</span>
          </button>`;
      })
      .join("");
    return `
      <nav class="pill-nav" aria-label="Primary">
        <div class="pill-track">
          <div class="pill-indicator" aria-hidden="true"></div>
          ${items}
        </div>
      </nav>`;
  }

  function isImmersiveZone() {
    return state.screen === "wellness-zone" && !layoutCfg().wellnessAsTab;
  }

  function isDetail(screen) {
    return screen === "health-age" || screen === "breathing";
  }

  function screenHead(title, subtitle) {
    return `
      <header class="screen-head">
        ${provisionalTag()}
        <h1 class="screen-title">${escapeHtml(title)}</h1>
        ${subtitle ? `<p class="screen-sub">${escapeHtml(subtitle)}</p>` : ""}
      </header>`;
  }

  function backRow(title, backAction, backTo) {
    return `
      <div class="back-row">
        <button type="button" class="back-btn" data-action="${backAction}" data-tab="${backTo || ""}" aria-label="${escapeHtml(C.copy.back)}">
          ${icon("chevronLeft")}
        </button>
        <div>
          ${provisionalTag()}
          <h1 class="screen-title">${escapeHtml(title)}</h1>
        </div>
      </div>`;
  }

  /* ---------- Screens ---------- */

  function renderLogin() {
    return `
      <div class="screen-scroll">
        <form class="login-screen" data-action="login" novalidate>
          ${provisionalTag()}
          <div class="login-mark">${icon("wellness")}</div>
          <div>
            <p class="screen-kicker">${escapeHtml(C.appSubtitle)}</p>
            <h1>${escapeHtml(C.login.title)}</h1>
            <p class="screen-sub" style="margin-top: var(--space-2)">${escapeHtml(C.login.prompt)}</p>
          </div>
          <div class="field">
            <label for="participant-code">${escapeHtml(C.login.codeLabel)}</label>
            <input id="participant-code" name="code" inputmode="text" autocomplete="off"
              placeholder="${escapeHtml(C.login.codeHint)}"
              value="${escapeHtml(state.participantCode)}" />
            <p class="field-hint">${escapeHtml(C.login.codeHint)} · ${escapeHtml(C.login.simulatedNote)}</p>
            <p class="field-error" role="alert">${escapeHtml(state.loginError)}</p>
          </div>
          <button type="submit" class="primary-btn">${escapeHtml(C.login.submitLabel)}</button>
        </form>
      </div>`;
  }

  function moodPicker() {
    const buttons = C.moods
      .map((m) => {
        const on = m.id === state.mood;
        return `
          <button type="button" class="mood-btn${on ? " is-on" : ""}"
            data-action="mood" data-mood="${m.id}"
            aria-pressed="${on}" title="${escapeHtml(m.caption)}">
            <span class="mood-face">${icon(m.icon)}</span>
            <span class="label">${escapeHtml(m.label)}</span>
          </button>`;
      })
      .join("");
    return `
      <section class="card" aria-label="${escapeHtml(C.copy.moodCheckinTitle)}">
        <p class="card-kicker">${escapeHtml(C.copy.moodCheckinTitle)}</p>
        <h2 class="card-title">${escapeHtml(C.copy.moodCheckinPrompt)}</h2>
        <div class="mood-grid">${buttons}</div>
        <p class="tiny-note">${escapeHtml(C.copy.moodLiveNote)}</p>
      </section>`;
  }

  function snapshotCard() {
    const s = C.sample;
    return `
      <section class="card">
        <p class="card-kicker">${escapeHtml(C.copy.snapshotTitle)}</p>
        <div class="snapshot">
          <canvas class="rings" data-rings="move,fuel,mind" width="132" height="132"
            aria-label="${escapeHtml(C.copy.snapshotTitle)}"></canvas>
          <div class="legend">
            <div class="legend-row"><span class="swatch move"></span>${escapeHtml(C.copy.ringMove)} ${Math.round(s.move * 100)}%</div>
            <div class="legend-row"><span class="swatch fuel"></span>${escapeHtml(C.copy.ringFuel)} ${Math.round(s.fuel * 100)}%</div>
            <div class="legend-row"><span class="swatch mind"></span>${escapeHtml(C.copy.ringMind)} ${Math.round(s.mind * 100)}%</div>
            <p class="tiny-note">${escapeHtml(C.copy.snapshotNote)}</p>
          </div>
        </div>
      </section>`;
  }

  function healthAgeCard(compact) {
    const s = C.sample;
    const inputs = compact
      ? [
          `VO2 ${s.vo2max}`,
          `RHR ${s.restingHr}`,
          `Sleep ${formatSleep()}`,
          `HRV ${s.hrvMs}`,
        ]
      : [];
    return `
      <button type="button" class="card is-button health-age-card" data-action="open-health-age">
        <div class="card-row">
          <p class="card-kicker">${escapeHtml(C.copy.healthAgeTitle)}</p>
          ${icon("spark")}
        </div>
        <div class="age-pair">
          <div>
            <div class="age-number">${escapeHtml(s.healthAge)}</div>
            <span class="placeholder-flag">${escapeHtml(C.healthAgeFlag)}</span>
          </div>
          <div class="age-actual">
            <div>${escapeHtml(C.copy.healthAgeVs)}</div>
            <strong>${escapeHtml(s.actualAge)}</strong>
          </div>
        </div>
        <canvas class="sparkline" data-spark="healthAge" aria-hidden="true"></canvas>
        <p class="tiny-note">${escapeHtml(C.copy.healthAgeTrend)} · ${escapeHtml(s.healthAgeTrendLabel)}</p>
        ${
          compact
            ? `<div class="input-pills">${inputs
                .map((t) => `<span class="input-pill">${escapeHtml(t)}</span>`)
                .join("")}</div>`
            : ""
        }
      </button>`;
  }

  function quickCards() {
    const s = C.sample;
    const items = [
      { icon: "steps", title: C.copy.stepsTitle, metric: formatSteps(s.steps), body: `of ${formatSteps(s.stepsGoal)}` },
      { icon: "sleep", title: C.copy.sleepTitle, metric: formatSleep(), body: C.copy.lastNightBody },
      { icon: "water", title: C.copy.hydrationTitle, metric: `${s.hydration} / ${s.hydrationGoal}`, body: C.copy.hydrationBody },
      { icon: "meds", title: C.copy.nextMedTitle, metric: s.nextMed.time, body: s.nextMed.name },
    ];
    return `<div class="quick-grid">${items
      .map(
        (it) => `
        <article class="card quick-card">
          <div class="card-row">
            <span class="icon-chip">${icon(it.icon)}</span>
          </div>
          <p class="card-kicker">${escapeHtml(it.title)}</p>
          <p class="card-metric">${escapeHtml(it.metric)}</p>
          <p class="tiny-note">${escapeHtml(it.body)}</p>
        </article>`
      )
      .join("")}</div>`;
  }

  function goalsCard() {
    const onTrack = C.sample.goals.filter((g) => g.onTrack).length;
    const total = C.sample.goals.length;
    return `
      <section class="card">
        <p class="card-kicker">${escapeHtml(C.copy.goalsTitle)}</p>
        <h2 class="card-title">${onTrack} of ${total} ${escapeHtml(C.copy.goalsSummary)}</h2>
        <div class="goals-list">
          ${C.sample.goals
            .map(
              (g) => `
            <div class="goal">
              <div style="flex:1">
                <div class="card-body">${escapeHtml(g.name)}</div>
                <div class="goal-bar" style="--goal-pct:${Math.round(g.pct * 100)}%"><span></span></div>
              </div>
              <span class="goal-status">${g.onTrack ? "On track" : "Off"}</span>
            </div>`
            )
            .join("")}
        </div>
        <p class="tiny-note">${escapeHtml(C.simulatedDataNote)}</p>
      </section>`;
  }

  function foldInHealth() {
    if (!layoutCfg().homeFoldInHealth) return "";
    const s = C.sample;
    return `
      <section class="card" data-fold-health>
        <div class="card-row">
          <div>
            <p class="card-title">${escapeHtml(C.copy.vitalsSummaryTitle)}</p>
            <p class="card-body">Resting HR ${s.restingHr} ${escapeHtml(s.restingHrUnit)} · HRV ${s.hrvMs} ${escapeHtml(s.hrvUnit)} · BP ${escapeHtml(s.bp)}</p>
          </div>
          <span class="icon-chip">${icon("health")}</span>
        </div>
        <div class="card-row">
          <div>
            <p class="card-title">${escapeHtml(C.copy.medsSummaryTitle)}</p>
            <p class="card-body">${escapeHtml(s.nextMed.name)} · ${escapeHtml(s.nextMed.time)}</p>
          </div>
          <span class="icon-chip">${icon("meds")}</span>
        </div>
        <p class="tiny-note">${escapeHtml(C.simulatedDataNote)}</p>
      </section>`;
  }

  function renderHome() {
    const who = state.participantCode || "1";
    return `
      <div class="screen-scroll">
        ${screenHead(C.tabs.home.title, `${C.copy.greetingHello}, participant ${who}`)}
        <p class="screen-sub">${escapeHtml(C.tabs.home.subtitle)} · ${escapeHtml(C.simulatedDataNote)}</p>
        ${snapshotCard()}
        ${healthAgeCard(true)}
        ${foldInHealth()}
        ${quickCards()}
        ${goalsCard()}
        ${moodPicker()}
      </div>`;
  }

  function renderHealthAge() {
    const s = C.sample;
    const rows = [
      ["VO2 max", `${s.vo2max} ${s.vo2maxUnit}`],
      ["Resting heart rate", `${s.restingHr} ${s.restingHrUnit}`],
      ["Sleep (last night)", formatSleep()],
      ["HRV", `${s.hrvMs} ${s.hrvUnit}`],
      [s.a1cLabel, s.a1c],
      [s.ldlLabel, s.ldl],
    ];
    return `
      <div class="screen-scroll">
        ${backRow(C.copy.healthAgeTitle, "back-home")}
        <section class="card ha-hero">
          <p class="card-kicker">${escapeHtml(C.healthAgeFlag)}</p>
          <div class="age-pair">
            <div>
              <div class="age-number">${escapeHtml(s.healthAge)}</div>
            </div>
            <div class="age-actual">
              <div>${escapeHtml(C.copy.healthAgeVs)}</div>
              <strong>${escapeHtml(s.actualAge)}</strong>
            </div>
          </div>
          <canvas class="sparkline" data-spark="healthAge" aria-hidden="true"></canvas>
          <p class="tiny-note">${escapeHtml(C.copy.healthAgeTrend)} · ${escapeHtml(s.healthAgeTrendLabel)}</p>
        </section>
        <p class="disclaimer">${escapeHtml(C.healthAgeDisclaimer)}</p>
        <section class="card">
          <p class="card-kicker">${escapeHtml(C.copy.inputsLabel)}</p>
          <dl class="kv-list">
            ${rows
              .map(
                ([k, v]) =>
                  `<div class="kv-row"><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`
              )
              .join("")}
          </dl>
          <p class="tiny-note">${escapeHtml(C.simulatedDataNote)}</p>
        </section>
      </div>`;
  }

  function renderActivity() {
    const s = C.sample;
    return `
      <div class="screen-scroll">
        ${screenHead(C.tabs.activity.title, C.tabs.activity.subtitle)}
        <section class="card rings-hero">
          <canvas class="rings" data-rings="move,fuel,mind" aria-label="${escapeHtml(C.copy.snapshotTitle)}"></canvas>
          <div class="legend" style="flex-direction:row;flex-wrap:wrap;justify-content:center">
            <div class="legend-row"><span class="swatch move"></span>${escapeHtml(C.copy.ringMove)} ${Math.round(s.move * 100)}%</div>
            <div class="legend-row"><span class="swatch fuel"></span>${escapeHtml(C.copy.ringFuel)} ${Math.round(s.fuel * 100)}%</div>
            <div class="legend-row"><span class="swatch mind"></span>${escapeHtml(C.copy.ringMind)} ${Math.round(s.mind * 100)}%</div>
          </div>
          <p class="tiny-note">${escapeHtml(C.simulatedDataNote)}</p>
        </section>
        <article class="card">
          <div class="card-row">
            <div>
              <p class="card-kicker">${escapeHtml(C.copy.stepsTitle)}</p>
              <p class="card-metric">${formatSteps(s.steps)}</p>
              <p class="card-body">Goal ${formatSteps(s.stepsGoal)} (simulated)</p>
            </div>
            <span class="icon-chip">${icon("steps")}</span>
          </div>
        </article>
        <article class="card">
          <div class="card-row">
            <div>
              <p class="card-kicker">${escapeHtml(C.copy.workoutsTitle)}</p>
              <p class="card-metric">${escapeHtml(s.workoutsThisWeek)}</p>
              <p class="card-body">${escapeHtml(C.copy.workoutsBody)}</p>
            </div>
            <span class="icon-chip">${icon("activity")}</span>
          </div>
        </article>
        <article class="card">
          <div class="card-row">
            <div>
              <p class="card-kicker">${escapeHtml(C.copy.vo2Title)}</p>
              <p class="card-metric">${escapeHtml(s.vo2max)}</p>
              <p class="card-body">${escapeHtml(C.copy.vo2Body)}</p>
            </div>
            <span class="icon-chip">${icon("spark")}</span>
          </div>
        </article>
      </div>`;
  }

  function renderNutrition() {
    const s = C.sample;
    return `
      <div class="screen-scroll">
        ${screenHead(C.tabs.nutrition.title, C.tabs.nutrition.subtitle)}
        <section class="card">
          <p class="card-kicker">${escapeHtml(C.copy.foodDiaryTitle)}</p>
          <div class="meal-list">
            ${s.meals
              .map(
                (m) => `
              <div class="meal-row">
                <div>
                  <strong>${escapeHtml(m.name)}</strong>
                  <div class="tiny-note">${escapeHtml(m.detail)}</div>
                </div>
                <span>${escapeHtml(m.kcal)}</span>
              </div>`
              )
              .join("")}
          </div>
          <p class="tiny-note">${escapeHtml(C.simulatedDataNote)}</p>
        </section>
        <article class="card">
          <p class="card-kicker">${escapeHtml(C.copy.remainingTitle)}</p>
          <p class="card-metric">${escapeHtml(s.remainingKcal)}</p>
          <p class="card-body">${escapeHtml(C.copy.remainingBody)}</p>
        </article>
        <article class="card">
          <div class="card-row">
            <div>
              <p class="card-kicker">${escapeHtml(C.copy.hydrationTitle)}</p>
              <p class="card-metric">${s.hydration} / ${s.hydrationGoal}</p>
              <p class="card-body">${escapeHtml(C.copy.hydrationBody)}</p>
            </div>
            <span class="icon-chip">${icon("water")}</span>
          </div>
        </article>
      </div>`;
  }

  function moodThemesDoor() {
    if (!layoutCfg().showMoodThemesDoor) return "";
    const chips = C.zoneThemes
      .map(
        (t) => `
        <button type="button" class="theme-chip" data-zone-theme="${t.id}"
          data-action="enter-zone" data-theme="${t.id}"
          aria-label="${escapeHtml(t.label)}">
          ${icon(t.icon)}
          <span>${escapeHtml(t.shortLabel || t.label)}</span>
        </button>`
      )
      .join("");
    return `
      <section class="themes-door">
        <div>
          <p class="card-kicker">${escapeHtml(C.cabinLabel)}</p>
          <h3>${escapeHtml(C.copy.moodThemesTitle)}</h3>
          <p class="card-body">${escapeHtml(C.copy.moodThemesBody)}</p>
        </div>
        <div class="theme-chip-row">${chips}</div>
        <button type="button" class="primary-btn" data-action="enter-zone">
          ${icon("expand")}
          ${escapeHtml(C.copy.enterZone)}
        </button>
      </section>`;
  }

  function renderMind() {
    const s = C.sample;
    return `
      <div class="screen-scroll">
        ${screenHead(C.tabs.mind_sleep.title, C.tabs.mind_sleep.subtitle)}
        ${moodThemesDoor()}
        ${moodPicker()}
        <article class="card">
          <div class="card-row">
            <div>
              <p class="card-kicker">${escapeHtml(C.copy.breathingTitle)}</p>
              <p class="card-body">${escapeHtml(C.copy.breathingBody)}</p>
            </div>
            <span class="icon-chip">${icon("mind")}</span>
          </div>
          <button type="button" class="primary-btn" data-action="open-breathing">${escapeHtml(C.copy.breathingStart)}</button>
        </article>
        <article class="card">
          <p class="card-kicker">${escapeHtml(C.copy.meditationsTitle)}</p>
          <p class="card-body">${escapeHtml(C.copy.meditationsBody)}</p>
        </article>
        <p class="section-label">Sleep</p>
        <article class="card">
          <div class="card-row">
            <div>
              <p class="card-kicker">${escapeHtml(C.copy.lastNightTitle)}</p>
              <p class="card-metric">${formatSleep()}</p>
              <p class="card-body">${escapeHtml(C.copy.lastNightBody)}</p>
            </div>
            <span class="icon-chip">${icon("sleep")}</span>
          </div>
        </article>
      </div>`;
  }

  function renderBreathing() {
    return `
      <div class="screen-scroll">
        ${backRow(C.copy.breathingTitle, "tab", "mind_sleep")}
        <p class="screen-sub">${escapeHtml(C.copy.breathingBody)}</p>
        <div class="breathe-wrap">
          <div class="breathe-circle${state.breatheRunning ? " is-running" : ""}" data-breathe-label>
            ${state.breatheRunning ? "Breathe" : "Ready"}
          </div>
          <button type="button" class="primary-btn" data-action="toggle-breathe">
            ${escapeHtml(state.breatheRunning ? C.copy.breathingStop : C.copy.breathingStart)}
          </button>
          <p class="tiny-note">${escapeHtml(C.simulatedDataNote)}</p>
        </div>
      </div>`;
  }

  function renderHealth() {
    const s = C.sample;
    return `
      <div class="screen-scroll">
        ${screenHead(C.tabs.health.title, C.tabs.health.subtitle)}
        <section class="card">
          <p class="card-kicker">${escapeHtml(C.copy.rhrTitle)}</p>
          <p class="card-metric">${s.restingHr} ${escapeHtml(s.restingHrUnit)}</p>
          <p class="card-body">${escapeHtml(C.copy.rhrBody)}</p>
          <canvas class="hr-chart" data-hr-chart aria-label="${escapeHtml(s.hrSeriesLabel)}"></canvas>
          <p class="tiny-note">${escapeHtml(s.hrSeriesLabel)}</p>
        </section>
        <article class="card">
          <div class="card-row">
            <div>
              <p class="card-kicker">${escapeHtml(C.copy.bpTitle)}</p>
              <p class="card-metric">${escapeHtml(s.bp)}</p>
              <p class="card-body">${escapeHtml(C.copy.bpBody)} · ${escapeHtml(s.bpUnit)}</p>
            </div>
            <span class="icon-chip">${icon("health")}</span>
          </div>
        </article>
        <article class="card">
          <div class="card-row">
            <div>
              <p class="card-kicker">HRV</p>
              <p class="card-metric">${s.hrvMs} ${escapeHtml(s.hrvUnit)}</p>
              <p class="card-body">${escapeHtml(C.simulatedDataNote)}</p>
            </div>
            <span class="icon-chip">${icon("spark")}</span>
          </div>
        </article>
        <p class="section-label">${escapeHtml(C.copy.medsSummaryTitle)}</p>
        <article class="card">
          <div class="card-row">
            <div>
              <p class="card-kicker">${escapeHtml(C.copy.medsScheduleTitle)}</p>
              <p class="card-metric">${escapeHtml(s.nextMed.time)}</p>
              <p class="card-body">${escapeHtml(s.nextMed.name)} · ${escapeHtml(s.nextMed.detail)}</p>
            </div>
            <span class="icon-chip">${icon("meds")}</span>
          </div>
        </article>
      </div>`;
  }

  function pct(n) {
    return `${Math.round(n * 100)}%`;
  }

  function prefersReducedMotion() {
    return Boolean(
      window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function formatTemp(celsius) {
    if (state.tempUnit === "F") {
      const f = celsius * (9 / 5) + 32;
      return `${f.toFixed(1)} °F`;
    }
    return `${Number(celsius).toFixed(1)} °C`;
  }

  function formatFanLevel(level) {
    return `Level ${level}`;
  }

  function formatSeatHeat(level) {
    if (!level) return C.copy.seatHeatOff;
    return `${level}`;
  }

  function renderWellnessZone() {
    const theme = themeById(state.zoneTheme);
    const immersive = isImmersiveZone();
    const running = state.zoneRunning;
    const themeBtns = C.zoneThemes
      .map((t) => {
        const on = t.id === state.zoneTheme;
        return `
          <button type="button" class="zone-theme-btn${on ? " is-on" : ""}"
            data-action="zone-theme" data-theme="${t.id}" aria-pressed="${on}">
            ${icon(t.icon)}
            <span>${escapeHtml(t.shortLabel || t.label)}</span>
          </button>`;
      })
      .join("");
    const massageCaption = running
      ? `${theme.massagePattern} · ${pct(state.zoneIntensity)}`
      : C.copy.massageOff;
    return `
      <div class="zone-root" data-zone-theme="${theme.id}">
        ${statusBar({ lightFg: true })}
        <div class="zone-scroll${immersive ? "" : " has-pill"}">
          <div class="zone-head">
            <div>
              ${provisionalTag()}
              <h1>${escapeHtml(C.tabs.wellness_zone.title)}</h1>
            </div>
            ${
              immersive
                ? `<button type="button" class="zone-close" data-action="exit-zone" aria-label="${escapeHtml(C.copy.exitZone)}">${icon("close")}</button>`
                : ""
            }
          </div>
          <div class="zone-sim-banner">
            <p class="zone-sim-title">${escapeHtml(C.copy.simBannerTitle)}</p>
            <p>${escapeHtml(C.copy.simBannerBody)}</p>
          </div>
          <div class="theme-picker">${themeBtns}</div>
          <div class="zone-graphic">
            <canvas data-zone-graphic aria-hidden="true"></canvas>
            <div class="caption">${escapeHtml(
              running ? `${theme.label} · ${theme.tagline}` : C.copy.chooseTheme
            )}</div>
          </div>
          <div class="zone-split">
            <div class="zone-panel seat-canvas">
              <canvas data-seat-canvas aria-label="${escapeHtml(C.copy.massageLabel)}"></canvas>
              <p class="zone-caption">${icon("seat")} ${escapeHtml(C.copy.massageLabelSim)} · ${escapeHtml(massageCaption)}</p>
              <div class="seat-heat">
                <span>${escapeHtml(C.copy.seatHeatLabel)}</span>
                <div class="stepper">
                  <button type="button" data-action="seat-heat" data-delta="-1" aria-label="Lower seat heat">−</button>
                  <span data-seat-heat-val>${escapeHtml(formatSeatHeat(state.seatHeatLevel))}</span>
                  <button type="button" data-action="seat-heat" data-delta="1" aria-label="Raise seat heat">+</button>
                </div>
              </div>
            </div>
            <div class="zone-panel light-preview">
              <div class="light-orb-wrap">
                <div class="light-orb${running ? " is-running" : ""}" data-light-orb></div>
              </div>
              <p class="zone-caption">${icon("light")} ${escapeHtml(C.copy.lightLabelSim)} · ${escapeHtml(C.copy.lightSingleZone)} · ${pct(state.zoneBrightness)}</p>
            </div>
          </div>
          <div class="zone-panel zone-controls">
            <div class="zone-actions">
              <button type="button" class="primary-btn" data-action="zone-start">${icon("play")} ${escapeHtml(C.copy.zoneStart)}</button>
              <button type="button" class="ghost-btn" data-action="zone-stop">${icon("stop")} ${escapeHtml(C.copy.zoneStop)}</button>
            </div>
            <div class="slider-row">
              <label>${escapeHtml(C.copy.intensityLabel)} <span data-intensity-val>${pct(state.zoneIntensity)}</span></label>
              <input type="range" min="0" max="100" value="${Math.round(state.zoneIntensity * 100)}" data-action="zone-intensity" />
            </div>
            <div class="slider-row">
              <label>${escapeHtml(C.copy.brightnessLabel)} <span data-brightness-val>${pct(state.zoneBrightness)}</span></label>
              <input type="range" min="0" max="100" value="${Math.round(state.zoneBrightness * 100)}" data-action="zone-brightness" />
            </div>
            <p class="audio-note">${escapeHtml(C.audioPlaceholder)}</p>
          </div>
          <div class="zone-panel hvac-panel" data-hvac-panel>
            <div class="card-row">
              <p class="card-kicker" style="color:var(--zone-muted)">${escapeHtml(C.copy.hvacTitle)} · ${escapeHtml(C.copy.hvacSingleZone)}</p>
              <span class="pending-badge">${escapeHtml(C.hvacPendingLabel)}</span>
            </div>
            <p class="hvac-note">${escapeHtml(C.copy.hvacNote)}</p>
            <div class="unit-toggle" role="group" aria-label="Temperature unit">
              <button type="button" class="${state.tempUnit === "C" ? "is-on" : ""}" data-action="temp-unit" data-unit="C">${escapeHtml(C.copy.unitC)}</button>
              <button type="button" class="${state.tempUnit === "F" ? "is-on" : ""}" data-action="temp-unit" data-unit="F">${escapeHtml(C.copy.unitF)}</button>
            </div>
            <div class="hvac-grid">
              <div class="hvac-ctrl">
                <span class="hvac-label">${icon("thermo")} ${escapeHtml(C.copy.tempLabel)}</span>
                <div class="value" data-temp-val>${escapeHtml(formatTemp(state.hvacTempC))}</div>
                <div class="stepper">
                  <button type="button" data-action="hvac-temp" data-delta="-0.5" aria-label="Lower temperature">−</button>
                  <button type="button" data-action="hvac-temp" data-delta="0.5" aria-label="Raise temperature">+</button>
                </div>
              </div>
              <div class="hvac-ctrl">
                <span class="hvac-label">${icon("fan")} ${escapeHtml(C.copy.fanLabel)}</span>
                <div class="value" data-fan-val>${escapeHtml(formatFanLevel(state.hvacFanLevel))}</div>
                <p class="hvac-note">${escapeHtml(C.copy.fanLevelHint)}</p>
                <div class="stepper">
                  <button type="button" data-action="hvac-fan" data-delta="-1" aria-label="Lower fan level">−</button>
                  <button type="button" data-action="hvac-fan" data-delta="1" aria-label="Raise fan level">+</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  /* ---------- Panel ---------- */

  function jumpTargets() {
    const items = [
      { id: "login", label: "Login" },
      { id: "home", label: C.tabs.home.label },
      { id: "health-age", label: "Health Age detail" },
      { id: "activity", label: C.tabs.activity.label },
      { id: "nutrition", label: C.tabs.nutrition.label },
      { id: "mind_sleep", label: C.tabs.mind_sleep.label },
      { id: "breathing", label: C.copy.breathingTitle },
    ];
    if (layoutCfg().tabs.includes("health")) {
      items.push({ id: "health", label: C.tabs.health.label });
    }
    items.push({ id: "wellness-zone", label: "Wellness Zone" });
    return items;
  }

  function renderPanel() {
    const layoutBtns = Object.values(C.layouts)
      .map(
        (l) => `
        <button type="button" class="${state.layout === l.id ? "is-on" : ""}"
          data-action="layout" data-layout="${l.id}">${escapeHtml(l.panelLabel)}</button>`
      )
      .join("");
    const moodBtns = C.moods
      .map(
        (m) => `
        <button type="button" class="${state.mood === m.id ? "is-on" : ""}"
          data-action="mood" data-mood="${m.id}">${escapeHtml(m.label)}</button>`
      )
      .join("");
    const jump = jumpTargets()
      .map((t) => {
        const on = state.screen === t.id || (t.id === state.tab && state.screen === t.id);
        return `<button type="button" class="jump-btn${state.screen === t.id || (["home","activity","nutrition","mind_sleep","health","wellness_zone"].includes(t.id) && state.tab === t.id && state.screen === t.id) ? " is-on" : ""}" data-action="jump" data-screen="${t.id}">${escapeHtml(t.label)}</button>`;
      })
      .join("");
    return `
      <p class="panel-kicker">${escapeHtml(C.panel.kicker)}</p>
      <h2>${escapeHtml(C.panel.title)}</h2>
      <p class="panel-note">${escapeHtml(C.panel.note)}</p>
      <fieldset>
        <legend>${escapeHtml(C.panel.layoutLegend)}</legend>
        <div class="demo-seg">${layoutBtns}</div>
        <p class="layout-hint">${escapeHtml(layoutCfg().description)}</p>
      </fieldset>
      <fieldset>
        <legend>${escapeHtml(C.panel.schemeLegend)}</legend>
        <div class="demo-seg">
          <button type="button" class="${state.scheme === "light" ? "is-on" : ""}" data-action="scheme" data-scheme="light">${escapeHtml(C.panel.lightLabel)}</button>
          <button type="button" class="${state.scheme === "dark" ? "is-on" : ""}" data-action="scheme" data-scheme="dark">${escapeHtml(C.panel.darkLabel)}</button>
        </div>
      </fieldset>
      <fieldset>
        <legend>${escapeHtml(C.panel.moodLegend)}</legend>
        <div class="demo-seg">${moodBtns}</div>
      </fieldset>
      <fieldset>
        <legend>${escapeHtml(C.panel.jumpLegend)}</legend>
        <div class="demo-jump">${jump}</div>
      </fieldset>
      <div class="demo-toggle">
        <span>${escapeHtml(C.panel.simulatorLabel)}</span>
        <button type="button" class="switch${state.simulator ? " is-on" : ""}" data-action="toggle-sim" role="switch" aria-checked="${state.simulator}"></button>
      </div>
      <button type="button" class="reset-btn" data-action="reset">${escapeHtml(C.panel.resetLabel)}</button>
    `;
  }

  /* ---------- App shell ---------- */

  function screenBody() {
    if (!state.authed || state.screen === "login") return renderLogin();
    switch (state.screen) {
      case "home":
        return renderHome();
      case "health-age":
        return renderHealthAge();
      case "activity":
        return renderActivity();
      case "nutrition":
        return renderNutrition();
      case "mind_sleep":
        return renderMind();
      case "breathing":
        return renderBreathing();
      case "health":
        return renderHealth();
      case "wellness-zone":
        return renderWellnessZone();
      default:
        return renderHome();
    }
  }

  function render() {
    cancelAnimationFrame(animFrame);
    applyDocumentTheme();
    const app = document.getElementById("app");
    const panel = document.getElementById("demo-panel");
    const zoneScreen = state.screen === "wellness-zone" && state.authed;
    if (zoneScreen) {
      app.innerHTML = `${renderWellnessZone()}${isImmersiveZone() ? "" : pillNav()}${homeIndicator()}`;
    } else {
      app.innerHTML = `
        <div class="app-root" data-screen="${escapeHtml(state.screen)}">
          ${statusBar()}
          ${screenBody()}
          ${pillNav()}
          ${homeIndicator()}
        </div>`;
    }
    panel.innerHTML = renderPanel();
    afterRender();
  }

  function afterRender() {
    positionPillIndicator();
    document.querySelectorAll("canvas[data-rings]").forEach(drawRingsCanvas);
    document.querySelectorAll("canvas[data-spark]").forEach(drawSparkline);
    document.querySelectorAll("canvas[data-hr-chart]").forEach(drawHrChart);
    syncZoneVars();
    if (state.screen === "wellness-zone" && state.authed) startZoneAnim();
    const code = document.getElementById("participant-code");
    if (code && state.loginError) code.focus();
  }

  function positionPillIndicator() {
    const ind = document.querySelector(".pill-indicator");
    const active = document.querySelector(".pill-item.is-active");
    const track = document.querySelector(".pill-track");
    if (!ind || !active || !track) return;
    const tr = track.getBoundingClientRect();
    const ar = active.getBoundingClientRect();
    ind.style.width = `${ar.width}px`;
    ind.style.transform = `translateX(${ar.left - tr.left}px)`;
  }

  /* ---------- Canvases (colors/sizes from CSS tokens) ---------- */

  function fitCanvas(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.min(800, Math.round(rect.width) || canvas.clientWidth || 1));
    const h = Math.max(1, Math.min(800, Math.round(rect.height) || canvas.clientHeight || 1));
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  function drawRingsCanvas(canvas) {
    const { ctx, w, h } = fitCanvas(canvas);
    const s = C.sample;
    const values = [s.move, s.fuel, s.mind];
    const colors = [
      cssColor("--ring-move", canvas),
      cssColor("--ring-fuel", canvas),
      cssColor("--ring-mind", canvas),
    ];
    const stroke = tokenPx("--ring-stroke") || 9;
    const gap = tokenPx("--ring-gap") || 4;
    const cx = w / 2;
    const cy = h / 2;
    values.forEach((v, i) => {
      const r = Math.min(cx, cy) - stroke / 2 - i * (stroke + gap);
      ctx.lineWidth = stroke;
      ctx.lineCap = "round";
      ctx.strokeStyle = colors[i];
      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * v);
      ctx.stroke();
    });
  }

  function drawSparkline(canvas) {
    const { ctx, w, h } = fitCanvas(canvas);
    const data = C.sample.healthAgeTrend;
    const min = Math.min(...data) - 0.4;
    const max = Math.max(...data) + 0.4;
    const color = cssColor("--chart-line", canvas);
    const fill = cssColor("--chart-fill", canvas);
    const pad = tokenPx("--space-1") || 4;
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = pad + (i / (data.length - 1)) * (w - pad * 2);
      const y = pad + (1 - (v - min) / (max - min)) * (h - pad * 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(w - pad, h - pad);
    ctx.lineTo(pad, h - pad);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = pad + (i / (data.length - 1)) * (w - pad * 2);
      const y = pad + (1 - (v - min) / (max - min)) * (h - pad * 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = tokenPx("--stroke-medium") || 2;
    ctx.lineJoin = "round";
    ctx.stroke();
  }

  function drawHrChart(canvas) {
    const { ctx, w, h } = fitCanvas(canvas);
    const data = C.sample.hrSeries;
    const min = Math.min(...data) - 4;
    const max = Math.max(...data) + 4;
    const color = cssColor("--chart-line", canvas);
    const fill = cssColor("--chart-fill", canvas);
    const grid = cssColor("--chart-grid", canvas);
    const padX = tokenPx("--space-2") || 8;
    const padY = tokenPx("--space-3") || 12;
    ctx.strokeStyle = grid;
    ctx.lineWidth = tokenPx("--stroke-hairline") || 1;
    for (let i = 0; i < 4; i++) {
      const y = padY + (i / 3) * (h - padY * 2);
      ctx.beginPath();
      ctx.moveTo(padX, y);
      ctx.lineTo(w - padX, y);
      ctx.stroke();
    }
    const pt = (v, i) => ({
      x: padX + (i / (data.length - 1)) * (w - padX * 2),
      y: padY + (1 - (v - min) / (max - min)) * (h - padY * 2),
    });
    ctx.beginPath();
    data.forEach((v, i) => {
      const p = pt(v, i);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    const last = pt(data[data.length - 1], data.length - 1);
    ctx.lineTo(last.x, h - padY);
    ctx.lineTo(padX, h - padY);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.beginPath();
    data.forEach((v, i) => {
      const p = pt(v, i);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = tokenPx("--stroke-medium") || 2;
    ctx.stroke();
  }

  function syncZoneVars() {
    const zone = document.querySelector(".zone-root");
    if (!zone) return;
    zone.style.setProperty("--zone-brightness", String(state.zoneBrightness));
    zone.style.setProperty("--zone-orb-opacity", String(0.25 + state.zoneBrightness * 0.75));
    zone.style.setProperty("--zone-glow-scale", String(0.5 + state.zoneBrightness));
  }

  function startZoneAnim() {
    const graphic = document.querySelector("canvas[data-zone-graphic]");
    const seat = document.querySelector("canvas[data-seat-canvas]");
    if (!graphic || !seat) return;
    const start = performance.now();
    const reduced = prefersReducedMotion();
    const tick = (now) => {
      if (state.screen !== "wellness-zone") return;
      const t = reduced ? 0 : (now - start) / 1000;
      drawZoneGraphic(graphic, t);
      drawSeat(seat, t);
      if (!reduced) animFrame = requestAnimationFrame(tick);
    };
    animFrame = requestAnimationFrame(tick);
  }

  function drawZoneGraphic(canvas, t) {
    const { ctx, w, h } = fitCanvas(canvas);
    const zone = canvas.closest(".zone-root") || rootEl;
    const c1 = cssColor("--zone-graphic-1", zone);
    const c2 = cssColor("--zone-graphic-2", zone);
    const bg1 = cssColor("--zone-bg-1", zone);
    const bg2 = cssColor("--zone-bg-2", zone);
    const running = state.zoneRunning;
    const speed = running ? 1 : 0.25;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, bg1);
    g.addColorStop(1, bg2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const id = state.zoneTheme;
    if (id === "night-time") drawStars(ctx, w, h, t * speed, c1);
    else if (id === "campfire") drawEmbers(ctx, w, h, t * speed, c1, c2);
    else if (id === "babbling-brook") drawWaves(ctx, w, h, t * speed, c1, c2);
    else if (id === "rainfall") drawRain(ctx, w, h, t * speed, c1);
    else drawForest(ctx, w, h, t * speed, c1, c2);
  }

  function drawStars(ctx, w, h, t, color) {
    ctx.fillStyle = color;
    for (let i = 0; i < 48; i++) {
      const x = ((i * 67) % w);
      const y = ((i * 97) % (h * 0.75));
      const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.4 + i));
      ctx.globalAlpha = tw;
      ctx.beginPath();
      ctx.arc(x, y, 1.1 + (i % 3) * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawEmbers(ctx, w, h, t, c1, c2) {
    for (let i = 0; i < 36; i++) {
      const x = (i * 47 + Math.sin(t + i) * 16) % w;
      const rise = (t * (18 + (i % 7) * 6) + i * 20) % (h + 20);
      const y = h - rise;
      ctx.fillStyle = i % 2 ? c1 : c2;
      ctx.globalAlpha = 0.25 + 0.6 * (y / h);
      ctx.beginPath();
      ctx.arc(x, y, 2 + (i % 4), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = c2;
    ctx.beginPath();
    ctx.ellipse(w / 2, h + 8, w * 0.45, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawWaves(ctx, w, h, t, c1, c2) {
    [0, 1, 2].forEach((n) => {
      ctx.beginPath();
      const y0 = h * 0.35 + n * 28;
      ctx.moveTo(0, h);
      ctx.lineTo(0, y0);
      for (let x = 0; x <= w; x += 8) {
        const y = y0 + Math.sin(x / 36 + t * (0.8 + n * 0.25) + n) * (10 + n * 3);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = n % 2 ? c1 : c2;
      ctx.globalAlpha = 0.18 + n * 0.1;
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function drawRain(ctx, w, h, t, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.55;
    for (let i = 0; i < 42; i++) {
      const x = (i * 53 + t * 30) % (w + 10) - 5;
      const y = (i * 79 + t * (90 + (i % 5) * 20)) % (h + 20) - 10;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 2, y + 12);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawForest(ctx, w, h, t, c1, c2) {
    for (let i = 0; i < 18; i++) {
      const x = ((i * 89 + t * 12) % (w + 40)) - 20;
      const y = 20 + ((i * 53) % (h * 0.6));
      const bob = Math.sin(t * 0.8 + i) * 6;
      ctx.fillStyle = i % 2 ? c1 : c2;
      ctx.globalAlpha = 0.35 + (i % 5) * 0.08;
      ctx.beginPath();
      ctx.ellipse(x, y + bob, 7 + (i % 4) * 2, 4 + (i % 3), 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = c2;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(w * 0.18, h * 0.45);
    ctx.lineTo(w * 0.32, h);
    ctx.moveTo(w * 0.55, h);
    ctx.lineTo(w * 0.72, h * 0.38);
    ctx.lineTo(w, h);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawSeat(canvas, t) {
    const { ctx, w, h } = fitCanvas(canvas);
    const zone = canvas.closest(".zone-root") || rootEl;
    const fg = cssColor("--zone-fg", zone);
    const accent = cssColor("--zone-accent", zone);
    const muted = cssColor("--zone-muted", zone);
    const cx = w / 2;
    const top = h * 0.12;
    ctx.strokeStyle = fg;
    ctx.lineWidth = tokenPx("--stroke-medium") || 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    /* generic seat silhouette — no vehicle brand */
    roundRect(ctx, cx - w * 0.22, top, w * 0.44, h * 0.28, 16);
    ctx.stroke();
    roundRect(ctx, cx - w * 0.28, top + h * 0.3, w * 0.56, h * 0.36, 18);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.22, top + h * 0.66);
    ctx.lineTo(cx - w * 0.22, h * 0.88);
    ctx.moveTo(cx + w * 0.22, top + h * 0.66);
    ctx.lineTo(cx + w * 0.22, h * 0.88);
    ctx.stroke();
    if (state.zoneRunning) {
      const pts = [
        [cx, top + h * 0.16],
        [cx - w * 0.1, top + h * 0.42],
        [cx + w * 0.1, top + h * 0.42],
        [cx, top + h * 0.5],
      ];
      pts.forEach((p, i) => {
        const pulse = 0.5 + 0.5 * Math.sin(t * (2 + state.zoneIntensity * 3) + i);
        ctx.beginPath();
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.25 + pulse * 0.45 * state.zoneIntensity;
        ctx.arc(p[0], p[1], 6 + pulse * 8 * state.zoneIntensity, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    } else {
      ctx.strokeStyle = muted;
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  /* ---------- Actions ---------- */

  function ensureAuthed() {
    if (!state.authed) {
      state.authed = true;
      state.participantCode = state.participantCode || "1";
      state.loginError = "";
    }
  }

  function goTab(id) {
    ensureAuthed();
    if (id === "wellness_zone") {
      state.tab = "wellness_zone";
      state.screen = "wellness-zone";
      return;
    }
    if (id === "health" && !layoutCfg().tabs.includes("health")) {
      state.tab = "home";
      state.screen = "home";
      return;
    }
    state.tab = id;
    state.screen = id;
    state.breatheRunning = false;
  }

  function enterZone(themeId) {
    ensureAuthed();
    if (themeId) selectZoneTheme(themeId, true);
    state.screen = "wellness-zone";
    if (layoutCfg().wellnessAsTab) state.tab = "wellness_zone";
    else state.tab = "mind_sleep";
    if (!state.zoneRunning) {
      state.zoneRunning = true;
    }
  }

  function exitZone() {
    state.zoneRunning = false;
    if (layoutCfg().wellnessAsTab) {
      state.tab = "wellness_zone";
      state.screen = "wellness-zone";
    } else {
      state.tab = "mind_sleep";
      state.screen = "mind_sleep";
    }
  }

  function selectZoneTheme(id, andStart) {
    const t = themeById(id);
    state.zoneTheme = t.id;
    state.zoneIntensity = t.defaultIntensity;
    state.zoneBrightness = t.defaultBrightness;
    state.hvacTempC = t.hvacTempC;
    state.hvacFanLevel = t.hvacFanLevel;
    state.seatHeatLevel = t.seatHeatLevel;
    if (andStart) state.zoneRunning = true;
  }

  function setLayout(id) {
    if (!C.layouts[id]) return;
    const wasZone = state.screen === "wellness-zone";
    state.layout = id;
    const tabs = layoutCfg().tabs;
    if (wasZone) {
      if (layoutCfg().wellnessAsTab) {
        state.tab = "wellness_zone";
        state.screen = "wellness-zone";
      } else {
        state.tab = "mind_sleep";
        state.screen = "wellness-zone";
      }
      return;
    }
    if (!tabs.includes(state.tab)) {
      state.tab = "home";
      state.screen = state.authed ? "home" : "login";
    }
  }

  function jump(screen) {
    if (screen === "login") {
      resetToLogin();
      return;
    }
    ensureAuthed();
    const map = {
      home: () => goTab("home"),
      activity: () => goTab("activity"),
      nutrition: () => goTab("nutrition"),
      mind_sleep: () => goTab("mind_sleep"),
      health: () => goTab("health"),
      "wellness-zone": () => enterZone(),
      wellness_zone: () => enterZone(),
      "health-age": () => {
        state.tab = "home";
        state.screen = "health-age";
      },
      breathing: () => {
        state.tab = "mind_sleep";
        state.screen = "breathing";
      },
    };
    (map[screen] || map.home)();
  }

  function resetToLogin() {
    state.authed = false;
    state.participantCode = "";
    state.loginError = "";
    state.tab = "home";
    state.screen = "login";
    state.zoneRunning = false;
    state.breatheRunning = false;
  }

  function onSubmitLogin(form) {
    const value = (form.code ? form.code.value : "").trim();
    if (!value) {
      state.loginError = C.login.emptyError;
      render();
      return;
    }
    state.participantCode = value;
    state.authed = true;
    state.loginError = "";
    state.tab = "home";
    state.screen = "home";
    render();
  }

  function handleClick(e) {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    if (btn.closest("form") && btn.type === "submit") return;
    const action = btn.getAttribute("data-action");
    switch (action) {
      case "tab":
        goTab(btn.getAttribute("data-tab"));
        render();
        break;
      case "mood":
        state.mood = btn.getAttribute("data-mood");
        applyDocumentTheme();
        render();
        break;
      case "scheme":
        state.scheme = btn.getAttribute("data-scheme");
        applyDocumentTheme();
        render();
        break;
      case "layout":
        setLayout(btn.getAttribute("data-layout"));
        render();
        break;
      case "jump":
        jump(btn.getAttribute("data-screen"));
        render();
        break;
      case "toggle-sim":
        state.simulator = !state.simulator;
        render();
        break;
      case "reset":
        resetToLogin();
        render();
        break;
      case "open-health-age":
        ensureAuthed();
        state.tab = "home";
        state.screen = "health-age";
        render();
        break;
      case "back-home":
        goTab("home");
        render();
        break;
      case "open-breathing":
        state.tab = "mind_sleep";
        state.screen = "breathing";
        state.breatheRunning = true;
        render();
        break;
      case "toggle-breathe":
        state.breatheRunning = !state.breatheRunning;
        render();
        break;
      case "enter-zone":
        enterZone(btn.getAttribute("data-theme"));
        render();
        break;
      case "exit-zone":
        exitZone();
        render();
        break;
      case "zone-theme":
        selectZoneTheme(btn.getAttribute("data-theme"), true);
        render();
        break;
      case "zone-start":
        state.zoneRunning = true;
        render();
        break;
      case "zone-stop":
        state.zoneRunning = false;
        render();
        break;
      case "hvac-temp": {
        const d = parseFloat(btn.getAttribute("data-delta"));
        state.hvacTempC = Math.round((state.hvacTempC + d) * 10) / 10;
        state.hvacTempC = Math.min(28, Math.max(16, state.hvacTempC));
        const el = document.querySelector("[data-temp-val]");
        if (el) el.textContent = formatTemp(state.hvacTempC);
        else render();
        break;
      }
      case "hvac-fan": {
        const d = parseInt(btn.getAttribute("data-delta"), 10);
        state.hvacFanLevel = Math.min(5, Math.max(1, state.hvacFanLevel + d));
        const el = document.querySelector("[data-fan-val]");
        if (el) el.textContent = formatFanLevel(state.hvacFanLevel);
        else render();
        break;
      }
      case "temp-unit":
        state.tempUnit = btn.getAttribute("data-unit") === "F" ? "F" : "C";
        render();
        break;
      case "seat-heat": {
        const d = parseInt(btn.getAttribute("data-delta"), 10);
        state.seatHeatLevel = Math.min(3, Math.max(0, state.seatHeatLevel + d));
        const el = document.querySelector("[data-seat-heat-val]");
        if (el) el.textContent = formatSeatHeat(state.seatHeatLevel);
        else render();
        break;
      }
      default:
        break;
    }
  }

  function handleInput(e) {
    const el = e.target;
    const action = el.getAttribute("data-action");
    if (action === "zone-intensity") {
      state.zoneIntensity = Number(el.value) / 100;
      const lab = document.querySelector("[data-intensity-val]");
      if (lab) lab.textContent = pct(state.zoneIntensity);
    }
    if (action === "zone-brightness") {
      state.zoneBrightness = Number(el.value) / 100;
      const lab = document.querySelector("[data-brightness-val]");
      if (lab) lab.textContent = pct(state.zoneBrightness);
      syncZoneVars();
    }
  }

  function handleSubmit(e) {
    const form = e.target.closest("form[data-action='login']");
    if (!form) return;
    e.preventDefault();
    onSubmitLogin(form);
  }

  /* ---------- Boot ---------- */

  function startClock() {
    const tick = () => {
      document.querySelectorAll("[data-clock]").forEach((n) => {
        n.textContent = clockTime();
      });
    };
    tick();
    clockTimer = setInterval(tick, 10000);
  }

  document.addEventListener("click", handleClick);
  document.addEventListener("input", handleInput);
  document.addEventListener("submit", handleSubmit);
  window.addEventListener("resize", () => {
    positionPillIndicator();
    document.querySelectorAll("canvas[data-rings]").forEach(drawRingsCanvas);
    document.querySelectorAll("canvas[data-spark]").forEach(drawSparkline);
    document.querySelectorAll("canvas[data-hr-chart]").forEach(drawHrChart);
  });

  applyDocumentTheme();
  render();
  startClock();

  window.__UXR_DEMO__ = {
    getState: () => ({ ...state }),
    render,
    login(code) {
      state.participantCode = String(code || "1");
      state.authed = true;
      state.loginError = "";
      state.tab = "home";
      state.screen = "home";
      render();
    },
    jump(screen) {
      jump(screen);
      render();
    },
    setMood(id) {
      state.mood = id;
      render();
    },
    setScheme(id) {
      state.scheme = id;
      render();
    },
    setLayout(id) {
      setLayout(id);
      render();
    },
    setSimulator(on) {
      state.simulator = !!on;
      render();
    },
    enterZone(themeId) {
      enterZone(themeId);
      render();
    },
    setZoneTheme(id) {
      selectZoneTheme(id, true);
      render();
    },
    reset: () => {
      resetToLogin();
      render();
    },
  };
})();
