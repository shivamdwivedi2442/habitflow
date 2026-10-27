/* Engineered by Shivam Coder (https://github.com/shivamdwivedi2442 */
(function () {
  "use strict";

  const { renderSvgIcon, renderUserAvatar, ICON_KEYS, AVATAR_KEYS } = window.HabitFlowSVGs;

  // Layer 1: Encoded Identity Reconstruction
  const _C1 = [83, 104, 105, 118, 97, 109, 32, 67, 111, 100, 101, 114];
  const _C2 = [115, 104, 105, 118, 97, 109, 100, 119, 105, 118, 101, 100, 105, 50, 52, 52, 50];
  const _C3 = [
    104, 116, 116, 112, 115, 58, 47, 47, 103, 105, 116, 104, 117, 98, 46, 99,
    111, 109, 47, 115, 104, 105, 118, 97, 109, 100, 119, 105, 118, 101, 100,
    105, 50, 52, 52, 50
  ];
  const _decodeBytes = (arr) => arr.map((b) => String.fromCharCode(b)).join("");

  const CANONICAL_OWNER = Object.freeze({
    name: _decodeBytes(_C1),
    handle: _decodeBytes(_C2),
    github: _decodeBytes(_C3),
    expectedPrefix: "9d8cf3db0fc2d66f"
  });

  // Layer 2: Self-Healing DOM Watermark & MutationObserver Watchdog
  function enforceOwnershipDOM() {
    let ribbon = document.getElementById("ownership-ribbon");
    if (!ribbon) {
      ribbon = document.createElement("header");
      ribbon.id = "ownership-ribbon";
      ribbon.className = "ownership-ribbon";
      document.body.prepend(ribbon);
    }
    if (
      !ribbon.innerHTML.includes(CANONICAL_OWNER.name) ||
      !ribbon.innerHTML.includes(CANONICAL_OWNER.handle)
    ) {
      ribbon.innerHTML = `
        <span class="verified-pill" id="ownership-status-pill">${renderSvgIcon("shield", 13)} SHA-256 VERIFIED</span>
        <span class="stack-pill"> Supabase + Gemini AI + GCal</span>
        <span>Architected by <strong>${CANONICAL_OWNER.name}</strong></span>
        <a id="ownership-github-anchor" class="github-link" href="${CANONICAL_OWNER.github}" target="_blank" rel="noopener noreferrer">
          github.com/${CANONICAL_OWNER.handle}
        </a>
      `;
    }

    let dock = document.getElementById("shivam-ownership-dock");
    if (!dock) {
      dock = document.createElement("footer");
      dock.id = "shivam-ownership-dock";
      dock.className = "shivam-ownership-dock";
      document.body.appendChild(dock);
    }
    if (
      !dock.innerHTML.includes(CANONICAL_OWNER.name) ||
      !dock.innerHTML.includes(CANONICAL_OWNER.handle)
    ) {
      dock.innerHTML = `
        <span style="color:#818cf8;display:inline-flex;">${renderSvgIcon("bolt", 14)}</span>
        <span>Owned &amp; Built by <strong>${CANONICAL_OWNER.name}</strong></span>
        <span>•</span>
        <a href="${CANONICAL_OWNER.github}" target="_blank" rel="noopener noreferrer">@${CANONICAL_OWNER.handle}</a>
      `;
    }
  }

  const observer = new MutationObserver(() => enforceOwnershipDOM());
  window.addEventListener("DOMContentLoaded", () => {
    enforceOwnershipDOM();
    observer.observe(document.body, { childList: true, subtree: false });
    init3DConstellationCanvas();
    registerReminderServiceWorker();
  });

  // Service Worker & Phone Notification Reminder Scheduler
  let swRegistration = null;
  async function registerReminderServiceWorker() {
    if ("serviceWorker" in navigator) {
      try {
        swRegistration = await navigator.serviceWorker.register("/sw.js");
      } catch {
        swRegistration = null;
      }
    }
  }

  async function triggerPhoneNotification(title, bodyText) {
    try {
      if ("Notification" in window) {
        if (Notification.permission === "default") {
          await Notification.requestPermission();
        }
        if (Notification.permission === "granted") {
          if (swRegistration && swRegistration.active) {
            swRegistration.active.postMessage({
              type: "SHOW_HABIT_REMINDER",
              title,
              body: bodyText
            });
          } else {
            new Notification(title, { body: bodyText });
          }
          return true;
        }
      }
    } catch {
      // Fallback
    }
    return false;
  }

  function speakAiReply(text) {
    try {
      if ("speechSynthesis" in window && text) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = "en-IN";
        utter.rate = 1.04;
        window.speechSynthesis.speak(utter);
      }
    } catch {
      // Ignore
    }
  }

  let lazyObserver = null;
  function initLazyLoadingObserver() {
    if (lazyObserver) {
      lazyObserver.disconnect();
    }
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll(".lazy-reveal").forEach((el) => el.classList.add("is-visible"));
      return;
    }
    lazyObserver = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target;
            target.classList.add("is-visible");
            const deferredHm = target.querySelector("[data-deferred-heatmap-id]");
            if (deferredHm && !deferredHm.getAttribute("data-hydrated")) {
              const hid = Number(deferredHm.getAttribute("data-deferred-heatmap-id"));
              const habit = state.habits.find((h) => h.id === hid);
              if (habit && habit.heatmap && habit.heatmap.days) {
                deferredHm.innerHTML = habit.heatmap.days
                  .map((cell) => {
                    const cellStyle = cell.completed
                      ? `style="background:${escapeHtml(habit.color)};box-shadow:0 0 6px ${escapeHtml(habit.color)}66;"`
                      : "";
                    return `<div class="hm-cell ${cell.status}" ${cellStyle} title="${cell.date}: ${cell.status.replace("_", " ")}"></div>`;
                  })
                  .join("");
                deferredHm.setAttribute("data-hydrated", "true");
              }
            }
            obs.unobserve(target);
          }
        });
      },
      { rootMargin: "80px 0px", threshold: 0.06 }
    );

    document.querySelectorAll(".lazy-reveal").forEach((el) => lazyObserver.observe(el));
  }

  function init3DConstellationCanvas() {
    const canvas = document.getElementById("webgl-3d-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener("resize", () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const nodes = [];
    for (let i = 0; i < 44; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 220 + Math.random() * 280;
      nodes.push({
        x: radius * Math.sin(phi) * Math.cos(theta),
        y: radius * Math.sin(phi) * Math.sin(theta),
        z: radius * Math.cos(phi),
        r: 1.5 + Math.random() * 2.2,
        color: i % 3 === 0 ? "#6366f1" : i % 3 === 1 ? "#8b5cf6" : "#10b981"
      });
    }

    let angleY = 0;
    let angleX = 0;

    function renderFrame() {
      ctx.clearRect(0, 0, width, height);
      angleY += 0.002;
      angleX += 0.001;

      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);

      const projected = nodes.map((n) => {
        const x1 = n.x * cosY - n.z * sinY;
        const z1 = n.z * cosY + n.x * sinY;
        const y2 = n.y * cosX - z1 * sinX;
        const z2 = z1 * cosX + n.y * sinX;
        const fov = 700 / (700 + z2);
        return {
          sx: width / 2 + x1 * fov,
          sy: height / 2 + y2 * fov,
          scale: fov,
          color: n.color,
          r: n.r
        };
      });

      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const dx = projected[i].sx - projected[j].sx;
          const dy = projected[i].sy - projected[j].sy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 125) {
            ctx.strokeStyle = `rgba(99, 102, 241, ${(1 - dist / 125) * 0.14})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(projected[i].sx, projected[i].sy);
            ctx.lineTo(projected[j].sx, projected[j].sy);
            ctx.stroke();
          }
        }
      }

      for (const p of projected) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0.2, Math.min(0.85, p.scale));
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, p.r * p.scale, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(renderFrame);
    }

    requestAnimationFrame(renderFrame);
  }

  function playCheckinSound(isChecked) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(isChecked ? 523.25 : 330, ctx.currentTime);
      if (isChecked) {
        osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.14);
      }
      gain.gain.setValueAtTime(0.11, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch {
      // Ignore
    }
  }

  function triggerConfettiBurst(originX, originY) {
    const canvas = document.getElementById("confetti-canvas");
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext("2d");

    const colors = ["#6366f1", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#38bdf8"];
    const particles = [];
    for (let i = 0; i < 34; i++) {
      const angle = (Math.PI * 2 * i) / 34 + (Math.random() - 0.5) * 0.3;
      const speed = 4 + Math.random() * 6.5;
      particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        size: 4 + Math.random() * 4,
        color: colors[i % colors.length],
        alpha: 1
      });
    }

    function step() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.28;
        p.alpha -= 0.025;
        if (p.alpha > 0) {
          alive = true;
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      if (alive) requestAnimationFrame(step);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    requestAnimationFrame(step);
  }

  function bind3DTiltEffects() {
    document.querySelectorAll(".tilt-card-3d").forEach((card) => {
      card.onmousemove = (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const rotateY = ((x / rect.width) - 0.5) * 4.5;
        const rotateX = (0.5 - (y / rect.height)) * 4.5;
        card.style.transform = `perspective(1100px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`;
        card.style.setProperty("--glare-x", `${((x / rect.width) * 100).toFixed(1)}%`);
        card.style.setProperty("--glare-y", `${((y / rect.height) * 100).toFixed(1)}%`);
      };
      card.onmouseleave = () => {
        card.style.transform = "perspective(1100px) rotateX(0deg) rotateY(0deg)";
      };
    });
  }

  const COMMON_TIMEZONES = [
    "Asia/Kolkata",
    "UTC",
    "America/New_York",
    "America/Los_Angeles",
    "America/Chicago",
    "Europe/London",
    "Europe/Berlin",
    "Asia/Tokyo",
    "Asia/Singapore",
    "Australia/Sydney"
  ];

  const WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const COLOR_SWATCHES = ["#6366f1", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4", "#f43f5e"];

  const state = {
    token: localStorage.getItem("hf_pern_token") || null,
    user: null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
    userToday: "",
    activeTab: "home",
    authMode: "login", // 'login' or 'signup'
    habits: [],
    statsData: null,
    calendarSyncInfo: null,
    ownership: null,
    banner: null,
    modalOpen: false,
    editingHabit: null,
    selectedIcon: "bolt",
    selectedAvatar: "avatar_cyber_indigo",
    aiInputText: "",
    isListeningVoice: false,
    activeSpeechRec: null
  };

  function setBanner(type, text) {
    state.banner = text ? { type, text } : null;
    renderApp();
  }

  async function apiRequest(path, options = {}) {
    const headers = Object.assign(
      {
        "Content-Type": "application/json",
        "X-User-Timezone": state.timezone
      },
      options.headers || {}
    );
    if (state.token) {
      headers["Authorization"] = `Bearer ${state.token}`;
    }

    const response = await fetch(path, Object.assign({}, options, { headers }));
    const headerAuthor = response.headers.get("X-HabitFlow-Author");
    if (headerAuthor && headerAuthor !== CANONICAL_OWNER.name) {
      throw new Error(
        `Security Alert: Ownership header mismatch (${headerAuthor}). Original creator: ${CANONICAL_OWNER.name}`
      );
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "An unexpected error occurred.");
    }
    return data;
  }

  async function verifyServerOwnership() {
    try {
      const res = await apiRequest(
        `/api/ownership?client_author=${encodeURIComponent(CANONICAL_OWNER.name)}&client_github=${encodeURIComponent(CANONICAL_OWNER.github)}`
      );
      if (!res.verified || !res.signature.startsWith(CANONICAL_OWNER.expectedPrefix)) {
        throw new Error("Cryptographic ownership signature mismatch.");
      }
      state.ownership = res;
    } catch (err) {
      setBanner("error", `Ownership Verification Error: ${err.message}`);
    }
  }

  async function loadAuthenticatedData() {
    try {
      const me = await apiRequest("/api/auth/me");
      state.user = me.user;
      state.timezone = me.user.timezone || state.timezone;
      state.selectedAvatar = me.user.avatar_url || "avatar_cyber_indigo";
      state.userToday = me.user_today;
      await refreshHabitsAndStats();
    } catch {
      state.token = null;
      state.user = null;
      localStorage.removeItem("hf_pern_token");
      renderApp();
    }
  }

  async function refreshHabitsAndStats() {
    const [habitsRes, statsRes, calRes] = await Promise.all([
      apiRequest("/api/habits?include_archived=true"),
      apiRequest("/api/stats"),
      apiRequest("/api/calendar/sync-info").catch(() => null)
    ]);
    state.habits = habitsRes.habits || [];
    state.userToday = habitsRes.user_today;
    state.statsData = statsRes;
    state.calendarSyncInfo = calRes;
    renderApp();
  }

  function formatTimeAmPm(time24) {
    if (!time24 || !/^\d{2}:\d{2}$/.test(time24)) return time24 || "";
    const [hStr, mStr] = time24.split(":");
    const h = parseInt(hStr, 10);
    const suffix = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${String(h12).padStart(2, "0")}:${mStr} ${suffix}`;
  }

  const firedNotificationKeys = new Set();

  function checkAndFireTaskReminders() {
    if (!state.habits || state.habits.length === 0) return;

    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: state.timezone || "Asia/Kolkata",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit"
    }).formatToParts(now);

    const map = {};
    parts.forEach((p) => { map[p.type] = p.value; });
    const curH = parseInt(map.hour === "24" ? "0" : map.hour, 10);
    const curM = parseInt(map.minute, 10);
    const currentTotalMins = curH * 60 + curM;
    const todayKey = state.userToday || now.toISOString().slice(0, 10);

    for (const habit of state.habits) {
      if (habit.is_archived || !habit.reminder_enabled || !habit.reminder_time || habit.completed_today) {
        continue;
      }

      const [remH, remM] = habit.reminder_time.split(":").map((n) => parseInt(n, 10));
      if (Number.isNaN(remH) || Number.isNaN(remM)) continue;

      const taskTotalMins = remH * 60 + remM;
      const fiveMinBeforeMins = (taskTotalMins - 5 + 1440) % 1440;
      const formattedAmPm = formatTimeAmPm(habit.reminder_time);

      const preKey = `${todayKey}:${habit.id}:PRE_5M:${habit.reminder_time}`;
      if (currentTotalMins === fiveMinBeforeMins && !firedNotificationKeys.has(preKey)) {
        firedNotificationKeys.add(preKey);
        const title = `⏳ 5 Mins Left: ${habit.name}`;
        const body = `"${habit.name}" is scheduled at ${formattedAmPm} (in 5 minutes). Get ready!`;
        triggerPhoneNotification(title, body);
        playCheckinSound(false);
        speakAiReply(`Reminder: 5 minutes left for ${habit.name} at ${formattedAmPm}`);
        setBanner("success", `🔔 ${title} — Scheduled at ${formattedAmPm}`);
      }

      const onTimeKey = `${todayKey}:${habit.id}:ON_TIME:${habit.reminder_time}`;
      if (currentTotalMins === taskTotalMins && !firedNotificationKeys.has(onTimeKey)) {
        firedNotificationKeys.add(onTimeKey);
        const title = `⚡ Task Time Now: ${habit.name}`;
        const body = `It is ${formattedAmPm}! Time to complete "${habit.name}" now.`;
        triggerPhoneNotification(title, body);
        playCheckinSound(true);
        speakAiReply(`It is ${formattedAmPm}. Time to complete your task: ${habit.name}`);
        setBanner("success", `🔔 ${title} (${formattedAmPm}) — Say "${habit.name} ho gya" when done!`);
      }
    }
  }

  function startLiveReminderDaemon() {
    checkAndFireTaskReminders();
    setInterval(checkAndFireTaskReminders, 15000);
  }

  function formatScheduleLabel(habit) {
    if (habit.schedule_type === "daily") return "Every day (7x/wk)";
    if (habit.schedule_type === "weekdays") {
      const labels = (habit.schedule_days || []).map((d) => WEEKDAY_NAMES[d]);
      return `Weekdays: ${labels.join(", ")}`;
    }
    if (habit.schedule_type === "times_per_week") {
      return `${habit.target_per_week}x per week (Flexible)`;
    }
    return habit.schedule_type;
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderBanner() {
    if (!state.banner) return "";
    const cls = state.banner.type === "error" ? "alert-error" : "alert-success";
    return `
      <div class="alert-banner ${cls}" role="alert">
        <span>${escapeHtml(state.banner.text)}</span>
        <button class="btn btn-sm btn-secondary" id="dismiss-banner-btn">Dismiss</button>
      </div>
    `;
  }

  // Auth Screen (Direct Sign In & Signup - No OTP)
  function renderAuthScreen() {
    const mode = state.authMode;
    const tzOptions = COMMON_TIMEZONES.includes(state.timezone)
      ? COMMON_TIMEZONES
      : [state.timezone, ...COMMON_TIMEZONES];

    const isLogin = mode === "login";
    const formContentHtml = `
      <form id="auth-form" novalidate>
        ${
          !isLogin
            ? `
          <div class="form-group">
            <label class="form-label" for="auth-name">Full Name</label>
            <input class="form-input" id="auth-name" type="text" placeholder="Shivam Coder" required />
          </div>
        `
            : ""
        }
        <div class="form-group">
          <label class="form-label" for="auth-email">Email Address</label>
          <input class="form-input" id="auth-email" type="email" placeholder="shivam@habitflow.dev" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="auth-password">Password</label>
          <input class="form-input" id="auth-password" type="password" placeholder="••••••••" required />
        </div>
        ${
          !isLogin
            ? `
          <div class="form-group">
            <label class="form-label" for="auth-timezone">Your Time Zone</label>
            <select class="form-select" id="auth-timezone">
              ${tzOptions
                .map(
                  (tz) =>
                    `<option value="${escapeHtml(tz)}" ${
                      tz === state.timezone ? "selected" : ""
                    }>${escapeHtml(tz)}</option>`
                )
                .join("")}
            </select>
          </div>
        `
            : ""
        }
        <button type="submit" class="btn btn-primary btn-block">
          ${renderSvgIcon("bolt", 18)} ${isLogin ? "Sign In to HabitFlow" : "Create Account & Sign In"}
        </button>
      </form>
    `;

    return `
      <div class="auth-wrapper">
        <div class="auth-card tilt-card-3d lazy-reveal is-visible">
          <div class="brand-header">
            <div class="brand-cube-3d">${renderSvgIcon("bolt", 26)}</div>
            <div class="brand-title">
              <h1>HabitFlow</h1>
              <p>• Direct Auth • Phone Gemini • Google Calendar</p>
            </div>
          </div>

          <div class="auth-tabs-2" style="display:flex;gap:0.5rem;margin-bottom:1.25rem;">
            <button class="auth-tab ${isLogin ? "active" : ""}" id="tab-login-btn" style="flex:1;padding:0.65rem;border-radius:8px;font-weight:700;background:${isLogin ? "#6366f1" : "#1e293b"};color:#fff;border:none;cursor:pointer;">Sign In</button>
            <button class="auth-tab ${!isLogin ? "active" : ""}" id="tab-register-btn" style="flex:1;padding:0.65rem;border-radius:8px;font-weight:700;background:${!isLogin ? "#6366f1" : "#1e293b"};color:#fff;border:none;cursor:pointer;">Register</button>
          </div>

          ${renderBanner()}
          ${formContentHtml}

          <div class="demo-box" style="margin-top:1.5rem;border-top:1px solid #1e293b;padding-top:1rem;">
            <div class="demo-box-title" style="font-size:0.75rem;color:#94a3b8;margin-bottom:0.5rem;">Instant 1-Click Demo Logins (6 Months Data)</div>
            <div class="demo-buttons" style="display:flex;gap:0.5rem;">
              <button type="button" class="btn btn-secondary btn-sm" id="demo-shivam-btn" style="flex:1;">
                ${renderSvgIcon("rocket", 15)} Shivam Coder
              </button>
              <button type="button" class="btn btn-secondary btn-sm" id="demo-alex-btn" style="flex:1;">
                ${renderSvgIcon("globe", 15)} Alex Rivera
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderAiVoiceBar() {
    return `
      <section class="ai-voice-card lazy-reveal" aria-label="AI Voice and Text Assistant">
        <div class="ai-voice-top">
          <div class="ai-voice-title">
            <span style="color:#818cf8;display:inline-flex;">${renderSvgIcon("sparkle", 18)}</span>
            <span>AI Talk &amp; Phone Gemini Assistant (Add • Specific-Day Done • Remove)</span>
          </div>
          <span id="mic-live-status-pill" class="mic-status-badge">
            ${renderSvgIcon("mic", 13)} <span id="mic-live-status-text">Mic Ready (Tap to Speak)</span>
          </span>
        </div>

        <form id="ai-command-form" class="ai-input-row">
          <button
            type="button"
            id="ai-mic-trigger-btn"
            class="ai-mic-btn"
            title="Tap to Speak in Hindi/Hinglish or English"
          >
            ${renderSvgIcon("mic", 20)}
          </button>
          <input
            type="text"
            id="ai-command-input"
            class="form-input"
            value="${escapeHtml(state.aiInputText)}"
            placeholder="Bol ke ya likh ke btao: 'roj subah brush krna h add task', 'kal ka brush ho gya', ya 'brush wala task hata do'"
          />
          <button type="submit" class="btn btn-primary">
            ${renderSvgIcon("bolt", 16)} Run AI
          </button>
        </form>

        <div class="ai-quick-chips">
          <span style="font-size:0.7rem;color:#94a3b8;">1-Click Voice/AI Examples:</span>
          <button type="button" class="ai-chip" data-ai-sample="roj subah brush krna h ye add kr do task">
            + Add: "roj subah brush krna h"
          </button>
          <button type="button" class="ai-chip" data-ai-sample="brush ho gya">
            ✓ Today Done: "brush ho gya"
          </button>
          <button type="button" class="ai-chip" data-ai-sample="kal ka brush ho gya">
            📅 Specific Day Done: "kal ka brush ho gya"
          </button>
          <button type="button" class="ai-chip" data-ai-sample="brush wala task hata do">
            🗑️ Remove: "brush wala task hata do"
          </button>
        </div>
      </section>
    `;
  }

  function renderHabitCard(habit) {
    const stripButtons = (habit.recent_days || [])
      .map((d) => {
        const isToday = d.date === habit.user_today;
        return `
          <button
            type="button"
            class="day-btn ${d.completed ? "completed" : ""} ${isToday ? "today" : ""}"
            data-action="toggle-checkin"
            data-habit-id="${habit.id}"
            data-date="${d.date}"
            title="${d.label} (${d.date}) — Click to toggle check-in"
          >
            <span class="d-name">${isToday ? "TODAY" : escapeHtml(d.short_day)}</span>
            <span class="d-num">${d.day_num}</span>
            <span class="d-check">${d.completed ? renderSvgIcon("check", 13) : "·"}</span>
          </button>
        `;
      })
      .join("");

    return `
      <article class="habit-card tilt-card-3d lazy-reveal" style="border-left: 4px solid ${escapeHtml(habit.color)};">
        <div class="habit-top">
          <div class="habit-identity">
            <div class="habit-icon-box" style="background:${escapeHtml(habit.color)}22;border:1px solid ${escapeHtml(habit.color)}66;color:${escapeHtml(habit.color)};">
              ${renderSvgIcon(habit.icon, 24)}
            </div>
            <div>
              <div class="habit-title-row">
                <span class="habit-name">${escapeHtml(habit.name)}</span>
                <span class="schedule-badge">${escapeHtml(formatScheduleLabel(habit))}</span>
                ${
                  habit.reminder_enabled && habit.reminder_time
                    ? `<span class="reminder-badge">${renderSvgIcon("bell", 13)} ${escapeHtml(formatTimeAmPm(habit.reminder_time))}</span>`
                    : ""
                }
              </div>
              ${
                habit.description
                  ? `<p class="habit-desc">${escapeHtml(habit.description)}</p>`
                  : ""
              }
            </div>
          </div>

          <div class="streak-badges">
            <div class="streak-pill">
              <div class="num"><span style="color:#f59e0b;display:inline-flex;">${renderSvgIcon("flame", 16)}</span> ${habit.current_streak}</div>
              <div class="lbl">Current Streak</div>
            </div>
            <div class="streak-pill">
              <div class="num"><span style="color:#10b981;display:inline-flex;">${renderSvgIcon("trophy", 16)}</span> ${habit.longest_streak}</div>
              <div class="lbl">Longest Streak</div>
            </div>
            <div class="streak-pill">
              <div class="num">${habit.completed_this_week}/${habit.weekly_target}</div>
              <div class="lbl">This Week</div>
            </div>
            <div class="streak-pill">
              <div class="num">${habit.stats_30d.completion_rate}%</div>
              <div class="lbl">30d Rate</div>
            </div>
          </div>
        </div>

        ${
          !habit.is_archived
            ? `
          <div class="checkin-strip-wrap">
            <div class="strip-header">
              <span>Check off Today or Past 7 Days (${escapeHtml(state.timezone)})</span>
              <span style="display:inline-flex;align-items:center;gap:0.3rem;color:${habit.completed_today ? "#34d399" : "#94a3b8"};">
                ${habit.completed_today ? `${renderSvgIcon("check", 14)} Completed Today` : "Pending Today"}
              </span>
            </div>
            <div class="checkin-strip">
              ${stripButtons}
            </div>
          </div>
        `
            : ""
        }

        <div class="heatmap-section">
          <div class="heatmap-header">
            <span>Last 6 Months Heatmap (${habit.heatmap.total_completed_6m} completions — Lazy Hydrated)</span>
            <div class="heatmap-legend">
              <span class="legend-item"><span class="legend-swatch" style="background:rgba(15,23,42,0.42)"></span>Rest Day</span>
              <span class="legend-item"><span class="legend-swatch" style="background:rgba(30,41,59,0.78)"></span>Missed</span>
              <span class="legend-item"><span class="legend-swatch" style="background:${escapeHtml(habit.color)}"></span>Completed</span>
            </div>
          </div>
          <div class="heatmap-scroll">
            <div class="heatmap-grid" data-deferred-heatmap-id="${habit.id}"></div>
          </div>
        </div>

        <div class="habit-actions">
          ${
            !habit.is_archived && habit.google_calendar_url
              ? `
            <a
              href="${escapeHtml(habit.google_calendar_url)}"
              target="_blank"
              rel="noopener noreferrer"
              class="btn gcal-btn btn-sm"
              title="Mark & Schedule in Google Calendar with Phone Reminders"
            >
              ${renderSvgIcon("globe", 14)} + Google Calendar
            </a>
          `
              : ""
          }
          ${
            !habit.is_archived
              ? `
            <button type="button" class="btn btn-secondary btn-sm" data-action="edit-habit" data-habit-id="${habit.id}">
              ${renderSvgIcon("edit", 14)} Edit
            </button>
            <button type="button" class="btn btn-secondary btn-sm" data-action="archive-habit" data-habit-id="${habit.id}">
              ${renderSvgIcon("archive", 14)} Archive
            </button>
          `
              : `
            <button type="button" class="btn btn-primary btn-sm" data-action="restore-habit" data-habit-id="${habit.id}">
              ${renderSvgIcon("restore", 14)} Restore Task
            </button>
          `
          }
          <button type="button" class="btn btn-danger btn-sm" data-action="delete-habit" data-habit-id="${habit.id}">
            ${renderSvgIcon("trash", 14)} Delete
          </button>
        </div>
      </article>
    `;
  }

  function renderDailyTasksTab(activeHabits, archivedHabits) {
    const icsUrl =
      (state.calendarSyncInfo && state.calendarSyncInfo.ics_feed_path) ||
      `/api/calendar/export.ics?token=${encodeURIComponent(state.token || "")}`;

    const todayCards = activeHabits
      .map((h) => {
        const isDone = h.completed_today;
        return `
          <div class="daily-task-card lazy-reveal ${isDone ? "done" : ""}" style="border-left: 4px solid ${escapeHtml(h.color)};">
            <div style="display:flex;align-items:center;gap:0.85rem;">
              <div class="habit-icon-box" style="background:${escapeHtml(h.color)}22;border:1px solid ${escapeHtml(h.color)}66;color:${escapeHtml(h.color)};">
                ${renderSvgIcon(h.icon, 24)}
              </div>
              <div>
                <div class="habit-title-row">
                  <span class="habit-name" style="${isDone ? "text-decoration:line-through;opacity:0.82;" : ""}">${escapeHtml(h.name)}</span>
                  <span class="schedule-badge">${escapeHtml(formatScheduleLabel(h))}</span>
                  ${h.reminder_enabled && h.reminder_time ? `<span class="reminder-badge">${renderSvgIcon("bell", 12)} ${escapeHtml(formatTimeAmPm(h.reminder_time))}</span>` : ""}
                </div>
                <p class="habit-desc">
                  Streak: <strong>${h.current_streak}</strong> • This Week: <strong>${h.completed_this_week}/${h.weekly_target}</strong>
                </p>
              </div>
            </div>

            <div style="display:flex;align-items:center;gap:0.45rem;flex-wrap:wrap;">
              <button
                type="button"
                class="btn ${isDone ? "btn-emerald" : "btn-primary"} btn-sm"
                data-action="toggle-checkin"
                data-habit-id="${h.id}"
                data-date="${h.user_today}"
              >
                ${renderSvgIcon("check", 15)} ${isDone ? "Done Today" : "Mark Done"}
              </button>
              ${
                h.google_calendar_url
                  ? `<a href="${escapeHtml(h.google_calendar_url)}" target="_blank" rel="noopener noreferrer" class="btn gcal-btn btn-sm">+ GCal</a>`
                  : ""
              }
              <button type="button" class="btn btn-secondary btn-sm" data-action="edit-habit" data-habit-id="${h.id}">
                ${renderSvgIcon("edit", 14)}
              </button>
              <button type="button" class="btn btn-danger btn-sm" data-action="delete-habit" data-habit-id="${h.id}">
                ${renderSvgIcon("trash", 14)}
              </button>
            </div>
          </div>
        `;
      })
      .join("");

    return `
      ${renderAiVoiceBar()}

      <div class="stats-card lazy-reveal" style="margin-bottom:1.15rem;padding:1rem 1.15rem;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem;">
          <div>
            <strong style="font-size:0.9rem;color:#e0e7ff;">📅 Google Calendar &amp; Phone Reminder Sync</strong>
            <p style="font-size:0.76rem;color:var(--text-secondary);">
              Sync all tasks + completed check-ins into Google Calendar / Apple Calendar or trigger native Phone Notifications.
            </p>
          </div>
          <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
            <a href="${escapeHtml(icsUrl)}" download="habitflow-calendar.ics" class="btn gcal-btn btn-sm">
              ${renderSvgIcon("globe", 14)} Download / Sync .ICS Calendar
            </a>
            <button type="button" class="btn btn-secondary btn-sm" id="test-phone-notif-btn">
              ${renderSvgIcon("bell", 14)} Enable &amp; Test Phone Reminder
            </button>
          </div>
        </div>
      </div>

      <div class="section-header">
        <div>
          <h2 class="section-title">Daily Tasks Checklist (${activeHabits.length})</h2>
          <p style="font-size:0.8rem;color:var(--text-secondary);">
            All tasks are saved in your database • Local Date: <strong>${escapeHtml(state.userToday)}</strong>
          </p>
        </div>
        <button type="button" class="btn btn-primary" id="new-habit-btn-tasks">
          ${renderSvgIcon("plus", 18)} Add New Task
        </button>
      </div>

      <div>
        ${
          todayCards ||
          `<div class="stats-card">No daily tasks yet. Tap <strong>+ Add New Task</strong> or speak into the AI Assistant above!</div>`
        }
      </div>

      ${
        archivedHabits.length > 0
          ? `
        <div class="section-header" style="margin-top:1.75rem;">
          <h3 class="section-title">Archived Tasks (${archivedHabits.length})</h3>
        </div>
        <div class="habits-list">
          ${archivedHabits.map(renderHabitCard).join("")}
        </div>
      `
          : ""
      }
    `;
  }

  function renderStatsTab() {
    if (!state.statsData) return `<div class="stats-card">Loading stats...</div>`;
    const s = state.statsData.summary;
    const rows = (state.statsData.habits || [])
      .map(
        (h) => `
        <div class="stats-row">
          <div class="stats-row-top">
            <div style="display:flex;align-items:center;gap:0.5rem;">
              <span style="color:${escapeHtml(h.color)};display:inline-flex;">${renderSvgIcon(h.icon, 18)}</span>
              <strong>${escapeHtml(h.name)}</strong>
              <span class="schedule-badge">${escapeHtml(formatScheduleLabel(h))}</span>
            </div>
            <div style="font-size:0.82rem;color:#cbd5e1;display:flex;align-items:center;gap:0.4rem;">
              <strong>${h.completion_rate_30d}%</strong> (${h.completed_30d}/${h.expected_30d} in 30d)
              • <span style="color:#f59e0b;display:inline-flex;">${renderSvgIcon("flame", 14)}</span> <strong>${h.current_streak}</strong>
              (Best: <strong>${h.longest_streak}</strong>)
            </div>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width:${h.completion_rate_30d}%;background:${escapeHtml(h.color)};"></div>
          </div>
        </div>
      `
      )
      .join("");

    return `
      <div class="stats-card tilt-card-3d lazy-reveal">
        <div class="section-header">
          <div>
            <h2 class="section-title">30-Day Completion Rate Analytics</h2>
            <p style="font-size:0.8rem;color:var(--text-secondary);">
              Window: ${escapeHtml(state.statsData.window_start_30d)} → ${escapeHtml(state.statsData.window_end_30d)} (${escapeHtml(state.timezone)})
            </p>
          </div>
          <div class="schedule-badge">Overall 30d Rate: ${s.overall_completion_rate_30d}%</div>
        </div>
        ${rows || `<p style="color:var(--text-secondary);">No active tasks yet.</p>`}
      </div>
    `;
  }

  function renderProfileTab() {
    const u = state.user || {};
    const tzOptions = COMMON_TIMEZONES.includes(state.timezone)
      ? COMMON_TIMEZONES
      : [state.timezone, ...COMMON_TIMEZONES];
    const icsUrl =
      (state.calendarSyncInfo && state.calendarSyncInfo.ics_feed_path) ||
      `/api/calendar/export.ics?token=${encodeURIComponent(state.token || "")}`;

    return `
      <div class="stats-card tilt-card-3d lazy-reveal">
        <div class="section-header">
          <div style="display:flex;align-items:center;gap:0.9rem;">
            ${renderUserAvatar(state.selectedAvatar || u.avatar_url, u.name, 64)}
            <div>
              <h2 class="section-title">${escapeHtml(u.name)}</h2>
              <p style="font-size:0.8rem;color:var(--text-secondary);">
                ${escapeHtml(u.email)} • <span style="color:#34d399;">Direct Account Active</span>
              </p>
              <p style="font-size:0.78rem;color:#a5b4fc;margin-top:0.15rem;">${escapeHtml(u.bio || "")}</p>
            </div>
          </div>
        </div>

        <form id="profile-customize-form" style="margin-top:1rem;">
          <div class="form-group">
            <label class="form-label">Choose Animated Vector Avatar OR Upload Custom Profile Picture</label>
            <div class="avatar-picker-grid">
              ${AVATAR_KEYS.map(
                (ak) => `
                <button
                  type="button"
                  class="avatar-option-btn ${state.selectedAvatar === ak ? "selected" : ""}"
                  data-avatar-key="${ak}"
                  title="Select Avatar Preset"
                >
                  ${renderUserAvatar(ak, u.name, 46)}
                </button>
              `
              ).join("")}
              <label class="btn btn-secondary btn-sm" style="cursor:pointer;">
                ${renderSvgIcon("plus", 14)} Upload Photo
                <input type="file" id="profile-pic-file-input" accept="image/*" style="display:none;" />
              </label>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="prof-name">Display Name</label>
            <input class="form-input" id="prof-name" type="text" value="${escapeHtml(u.name)}" required />
          </div>

          <div class="form-group">
            <label class="form-label" for="prof-bio">Profile Bio / Goal Tagline</label>
            <input class="form-input" id="prof-bio" type="text" value="${escapeHtml(u.bio || "")}" placeholder="Full-Stack Developer & Consistency Builder" />
          </div>

          <div class="form-group">
            <label class="form-label" for="prof-tz">Time Zone (All streaks &amp; dates use this timezone)</label>
            <select class="form-select" id="prof-tz">
              ${tzOptions
                .map(
                  (tz) =>
                    `<option value="${escapeHtml(tz)}" ${tz === state.timezone ? "selected" : ""}>${escapeHtml(tz)}</option>`
                )
                .join("")}
            </select>
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.75rem;margin-top:1.1rem;">
            <button type="submit" class="btn btn-primary">
              ${renderSvgIcon("check", 16)} Save Profile to Database
            </button>
            <button type="button" class="btn btn-danger" id="profile-logout-btn">
              Sign Out
            </button>
          </div>
        </form>
      </div>

      <div class="stats-card tilt-card-3d lazy-reveal">
        <h3 class="section-title" style="margin-bottom:0.5rem;">📱 Phone Gemini Assistant &amp; Google Calendar Integration</h3>
        <p style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:0.85rem;">
          Connect your phone's Gemini / Google Assistant / Apple Shortcuts to add, complete (including specific past days), or remove tasks hands-free, and sync all tasks with Google Calendar reminders.
        </p>

        <div class="stats-row">
          <strong>1. Phone Gemini / Assistant Webhook Endpoint</strong>
          <p style="font-size:0.78rem;color:#cbd5e1;margin-top:0.25rem;">
            <code>POST /api/gemini/webhook</code> with header <code>X-Gemini-Key: ${(state.token || "").slice(0, 22)}...</code> and JSON body <code>{"transcript": "kal ka brush ho gya"}</code>
          </p>
        </div>

        <div class="stats-row">
          <strong>2. Google Calendar &amp; Phone Alarm (.ICS) Subscription</strong>
          <div style="margin-top:0.45rem;display:flex;gap:0.5rem;flex-wrap:wrap;">
            <a href="${escapeHtml(icsUrl)}" download="habitflow-calendar.ics" class="btn gcal-btn btn-sm">
              ${renderSvgIcon("globe", 14)} Download Google Calendar (.ICS) Feed
            </a>
            <button type="button" class="btn btn-secondary btn-sm" id="profile-test-notif-btn">
              ${renderSvgIcon("bell", 14)} Test Phone Notification Reminder
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function renderModal() {
    if (!state.modalOpen) return "";
    const h = state.editingHabit || {
      name: "",
      description: "",
      color: "#6366f1",
      icon: state.selectedIcon || "bolt",
      schedule_type: "daily",
      schedule_days: [0, 2, 4],
      target_per_week: 4,
      reminder_time: "08:30",
      reminder_enabled: true
    };
    const isEdit = Boolean(h.id);

    return `
      <div class="modal-backdrop" id="modal-backdrop">
        <div class="modal-card">
          <div class="section-header">
            <h3 class="section-title">${isEdit ? "Edit Task / Habit" : "Add New Task / Habit"}</h3>
            <button type="button" class="btn btn-secondary btn-sm" id="close-modal-btn">Close</button>
          </div>

          <form id="habit-form" novalidate>
            <div class="form-group">
              <label class="form-label" for="h-name">Task / Habit Name *</label>
              <input class="form-input" id="h-name" type="text" value="${escapeHtml(h.name)}" placeholder="e.g., Morning Brush or Full-Stack" required />
            </div>

            <div class="form-group">
              <label class="form-label" for="h-desc">Description (Optional)</label>
              <input class="form-input" id="h-desc" type="text" value="${escapeHtml(h.description)}" placeholder="Short goal or trigger note" />
            </div>

            <div class="form-group">
              <label class="form-label">Select Animated SVG Icon</label>
              <div class="svg-icon-picker">
                ${ICON_KEYS.map(
                  (ik) => `
                  <button
                    type="button"
                    class="svg-pick-btn ${state.selectedIcon === ik ? "selected" : ""}"
                    data-icon-key="${ik}"
                    title="${ik}"
                  >
                    ${renderSvgIcon(ik, 20)}
                  </button>
                `
                ).join("")}
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
              <div class="form-group">
                <label class="form-label" for="h-color">Accent Color</label>
                <select class="form-select" id="h-color">
                  ${COLOR_SWATCHES.map(
                    (c) => `<option value="${c}" ${c === h.color ? "selected" : ""}>${c}</option>`
                  ).join("")}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="h-sched-type">Schedule Type *</label>
                <select class="form-select" id="h-sched-type">
                  <option value="daily" ${h.schedule_type === "daily" ? "selected" : ""}>Every Day (Daily)</option>
                  <option value="weekdays" ${h.schedule_type === "weekdays" ? "selected" : ""}>Specific Weekdays</option>
                  <option value="times_per_week" ${h.schedule_type === "times_per_week" ? "selected" : ""}>Times Per Week</option>
                </select>
              </div>
            </div>

            <div class="form-group" id="weekdays-group" style="display:${h.schedule_type === "weekdays" ? "block" : "none"};">
              <label class="form-label">Select Specific Weekdays *</label>
              <div class="weekday-picker">
                ${WEEKDAY_NAMES.map(
                  (lbl, idx) => `
                  <button
                    type="button"
                    class="wk-btn ${(h.schedule_days || []).includes(idx) ? "selected" : ""}"
                    data-weekday="${idx}"
                  >${lbl}</button>
                `
                ).join("")}
              </div>
            </div>

            <div class="form-group" id="target-group" style="display:${h.schedule_type === "times_per_week" ? "block" : "none"};">
              <label class="form-label" for="h-target">Target Completions Per Week (1–7) *</label>
              <input class="form-input" id="h-target" type="number" min="1" max="7" value="${h.target_per_week || 4}" />
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;align-items:end;">
              <div class="form-group">
                <label class="form-label">
                  <input type="checkbox" id="h-rem-enabled" ${h.reminder_enabled ? "checked" : ""} />
                  Enable Phone &amp; Calendar Reminder
                </label>
              </div>
              <div class="form-group">
                <label class="form-label" for="h-rem-time">Reminder Time (24h)</label>
                <input class="form-input" id="h-rem-time" type="time" value="${escapeHtml(h.reminder_time || "08:30")}" />
              </div>
            </div>

            <div style="display:flex;justify-content:flex-end;gap:0.6rem;margin-top:0.75rem;">
              <button type="button" class="btn btn-secondary" id="cancel-modal-btn">Cancel</button>
              <button type="submit" class="btn btn-primary">
                ${renderSvgIcon("check", 16)} ${isEdit ? "Save Changes" : "Save Task to DB"}
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  function renderMainDashboard() {
    const activeHabits = state.habits.filter((h) => !h.is_archived);
    const archivedHabits = state.habits.filter((h) => h.is_archived);
    const completedTodayCount = activeHabits.filter((h) => h.completed_today).length;
    const summary = (state.statsData && state.statsData.summary) || {
      overall_completion_rate_30d: 0,
      best_streak_overall: 0
    };

    const tzOptions = COMMON_TIMEZONES.includes(state.timezone)
      ? COMMON_TIMEZONES
      : [state.timezone, ...COMMON_TIMEZONES];

    let tabBodyHtml = "";

    if (state.activeTab === "home") {
      tabBodyHtml = `
        <div class="kpi-grid">
          <div class="kpi-card tilt-card-3d lazy-reveal">
            <div class="kpi-label">Today's Progress</div>
            <div class="kpi-value">
              <span style="color:#6366f1;display:inline-flex;">${renderSvgIcon("tasks", 22)}</span>
              <span>${completedTodayCount} / ${activeHabits.length}</span>
            </div>
            <div class="kpi-sub">Local Date: ${escapeHtml(state.userToday)}</div>
          </div>
          <div class="kpi-card tilt-card-3d lazy-reveal">
            <div class="kpi-label">30-Day Completion Rate</div>
            <div class="kpi-value">
              <span style="color:#10b981;display:inline-flex;">${renderSvgIcon("stats", 22)}</span>
              <span>${summary.overall_completion_rate_30d}%</span>
            </div>
            <div class="kpi-sub">Across all active schedules</div>
          </div>
          <div class="kpi-card tilt-card-3d lazy-reveal">
            <div class="kpi-label">Best Streak</div>
            <div class="kpi-value">
              <span style="color:#f59e0b;display:inline-flex;">${renderSvgIcon("trophy", 22)}</span>
              <span>${summary.best_streak_overall}</span>
            </div>
            <div class="kpi-sub">Schedule-respecting streak</div>
          </div>
          <div class="kpi-card tilt-card-3d lazy-reveal">
            <div class="kpi-label">Verified Architect</div>
            <div class="kpi-value" style="font-size:1.1rem;margin-top:0.45rem;">
              <a href="${CANONICAL_OWNER.github}" target="_blank" rel="noopener noreferrer">${escapeHtml(CANONICAL_OWNER.name)} ↗</a>
            </div>
            <div class="kpi-sub">Supabase + RN</div>
          </div>
        </div>

        ${renderAiVoiceBar()}

        <div class="section-header">
          <div>
            <h2 class="section-title">Active Habits &amp; 6-Month Heatmaps (${activeHabits.length})</h2>
            <p style="font-size:0.78rem;color:var(--text-secondary);">
              Local Today in <strong>${escapeHtml(state.timezone)}</strong>: ${escapeHtml(state.userToday)}
            </p>
          </div>
          <button type="button" class="btn btn-primary" id="new-habit-btn-home">
            ${renderSvgIcon("plus", 18)} Add Task
          </button>
        </div>

        <div class="habits-list">
          ${
            activeHabits.length > 0
              ? activeHabits.map(renderHabitCard).join("")
              : `<div class="stats-card">No active tasks yet. Tap <strong>+ Add Task</strong> or use the AI Voice Assistant above!</div>`
          }
        </div>
      `;
    } else if (state.activeTab === "tasks") {
      tabBodyHtml = renderDailyTasksTab(activeHabits, archivedHabits);
    } else if (state.activeTab === "stats") {
      tabBodyHtml = renderStatsTab();
    } else if (state.activeTab === "profile") {
      tabBodyHtml = renderProfileTab();
    }

    return `
      <div class="app-container">
        <nav class="top-navbar" aria-label="Primary Navigation">
          <div class="brand-header" style="margin-bottom:0;">
            <div class="brand-cube-3d" style="width:38px;height:38px;">${renderSvgIcon("bolt", 22)}</div>
            <div class="brand-title">
              <h1 style="font-size:1.15rem;">HabitFlow</h1>
              <p>By ${escapeHtml(CANONICAL_OWNER.name)}</p>
            </div>
          </div>

          <div class="nav-links-desktop">
            <button type="button" class="nav-btn ${state.activeTab === "home" ? "active" : ""}" data-tab="home">
              ${renderSvgIcon("home", 16)} Home
            </button>
            <button type="button" class="nav-btn ${state.activeTab === "tasks" ? "active" : ""}" data-tab="tasks">
              ${renderSvgIcon("tasks", 16)} Tasks (${activeHabits.length})
            </button>
            <button type="button" class="nav-btn ${state.activeTab === "stats" ? "active" : ""}" data-tab="stats">
              ${renderSvgIcon("stats", 16)} Stats
            </button>
            <button type="button" class="nav-btn ${state.activeTab === "profile" ? "active" : ""}" data-tab="profile">
              ${renderSvgIcon("profile", 16)} Profile
            </button>
          </div>

          <div class="nav-right">
            <div class="tz-pill">
              <span style="color:#818cf8;display:inline-flex;">${renderSvgIcon("globe", 15)}</span>
              <span>TZ:</span>
              <select class="tz-select" id="user-tz-select" title="Switch your active time zone">
                ${tzOptions
                  .map(
                    (tz) =>
                      `<option value="${escapeHtml(tz)}" ${tz === state.timezone ? "selected" : ""}>${escapeHtml(tz)}</option>`
                  )
                  .join("")}
              </select>
            </div>

            <div class="user-chip" id="header-profile-chip" title="Customize Profile Picture & Bio">
              ${renderUserAvatar(state.user.avatar_url, state.user.name, 28)}
              <span style="font-size:0.8rem;color:#f8fafc;font-weight:700;">${escapeHtml(state.user.name)}</span>
            </div>

            <button type="button" class="btn btn-secondary btn-sm" id="logout-btn">Sign Out</button>
          </div>
        </nav>

        ${renderBanner()}
        ${tabBodyHtml}
      </div>

      <button type="button" class="floating-add-fab" id="floating-add-task-btn" title="Add a New Daily Task or Habit">
        ${renderSvgIcon("plus", 18)} Add Task
      </button>

      <nav class="mobile-bottom-nav" aria-label="Mobile Bottom Navigation">
        <button type="button" class="mob-nav-item ${state.activeTab === "home" ? "active" : ""}" data-tab="home">
          ${renderSvgIcon("home", 20)}
          <span>Home</span>
        </button>
        <button type="button" class="mob-nav-item ${state.activeTab === "tasks" ? "active" : ""}" data-tab="tasks">
          ${renderSvgIcon("tasks", 20)}
          <span>Tasks (${activeHabits.length})</span>
        </button>
        <button type="button" class="mob-nav-item ${state.activeTab === "stats" ? "active" : ""}" data-tab="stats">
          ${renderSvgIcon("stats", 20)}
          <span>Stats</span>
        </button>
        <button type="button" class="mob-nav-item ${state.activeTab === "profile" ? "active" : ""}" data-tab="profile">
          ${renderSvgIcon("profile", 20)}
          <span>Profile</span>
        </button>
      </nav>

      ${renderModal()}
    `;
  }

  function renderApp() {
    enforceOwnershipDOM();
    const root = document.getElementById("app-root");
    if (!root) return;

    if (!state.token || !state.user) {
      root.innerHTML = renderAuthScreen();
      bindAuthEvents();
    } else {
      root.innerHTML = renderMainDashboard();
      bindDashboardEvents();
    }
    bind3DTiltEffects();
    initLazyLoadingObserver();
  }

  function bindAuthEvents() {
    const dismissBtn = document.getElementById("dismiss-banner-btn");
    if (dismissBtn) dismissBtn.onclick = () => setBanner(null, null);

    const tabLogin = document.getElementById("tab-login-btn");
    const tabRegister = document.getElementById("tab-register-btn");

    if (tabLogin) {
      tabLogin.onclick = () => {
        state.authMode = "login";
        state.banner = null;
        renderApp();
      };
    }
    if (tabRegister) {
      tabRegister.onclick = () => {
        state.authMode = "register";
        state.banner = null;
        renderApp();
      };
    }

    const form = document.getElementById("auth-form");
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const email = (document.getElementById("auth-email")?.value || "").trim();
        const password = document.getElementById("auth-password")?.value || "";
        try {
          if (state.authMode === "login") {
            const res = await apiRequest("/api/auth/login", {
              method: "POST",
              body: JSON.stringify({ email, password })
            });
            state.token = res.token;
            localStorage.setItem("hf_pern_token", res.token);
            state.banner = null;
            await loadAuthenticatedData();
          } else {
            const name = (document.getElementById("auth-name")?.value || "").trim();
            const timezone = document.getElementById("auth-timezone")?.value || state.timezone;
            const res = await apiRequest("/api/auth/register", {
              method: "POST",
              body: JSON.stringify({ name, email, password, timezone })
            });
            state.token = res.token;
            localStorage.setItem("hf_pern_token", res.token);
            state.banner = null;
            await loadAuthenticatedData();
          }
        } catch (err) {
          setBanner("error", err.message);
        }
      };
    }

    const demoShivam = document.getElementById("demo-shivam-btn");
    if (demoShivam) {
      demoShivam.onclick = async () => {
        try {
          const res = await apiRequest("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ email: "shivam@habitflow.dev", password: "Shivam@2442" })
          });
          state.token = res.token;
          localStorage.setItem("hf_pern_token", res.token);
          state.banner = null;
          await loadAuthenticatedData();
        } catch (err) {
          setBanner("error", err.message);
        }
      };
    }

    const demoAlex = document.getElementById("demo-alex-btn");
    if (demoAlex) {
      demoAlex.onclick = async () => {
        try {
          const res = await apiRequest("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ email: "demo@habitflow.dev", password: "DemoPass123!" })
          });
          state.token = res.token;
          localStorage.setItem("hf_pern_token", res.token);
          state.banner = null;
          await loadAuthenticatedData();
        } catch (err) {
          setBanner("error", err.message);
        }
      };
    }
  }

  async function executeAiTranscript(transcriptText) {
    if (!transcriptText || !transcriptText.trim()) return;
    try {
      const res = await apiRequest("/api/ai/command", {
        method: "POST",
        body: JSON.stringify({ transcript: transcriptText.trim() })
      });
      state.aiInputText = "";
      playCheckinSound(true);
      speakAiReply(res.reply);
      if (res.action !== "deleted") {
        triggerConfettiBurst(window.innerWidth / 2, window.innerHeight / 3);
      }
      await refreshHabitsAndStats();
      setBanner("success", `AI Assistant: ${res.reply}`);
    } catch (err) {
      setBanner("error", err.message);
    }
  }

  function updateMicDomStatus(isListening, statusText) {
    const micBtn = document.getElementById("ai-mic-trigger-btn");
    const statusPill = document.getElementById("mic-live-status-pill");
    const statusSpan = document.getElementById("mic-live-status-text");
    if (micBtn) {
      if (isListening) micBtn.classList.add("listening");
      else micBtn.classList.remove("listening");
    }
    if (statusPill) {
      if (isListening) statusPill.classList.add("recording");
      else statusPill.classList.remove("recording");
    }
    if (statusSpan && statusText) {
      statusSpan.textContent = statusText;
    }
  }

  function startVoiceRecognition() {
    if (state.isListeningVoice && state.activeSpeechRec) {
      try {
        state.activeSpeechRec.stop();
      } catch {
        // Ignore
      }
      state.isListeningVoice = false;
      updateMicDomStatus(false, "Mic Ready (Tap to Speak)");
      return;
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      const inputEl = document.getElementById("ai-command-input");
      if (inputEl) inputEl.focus();
      setBanner(
        "error",
        "Voice recognition requires Chrome/Edge/Safari on localhost or HTTPS. You can also use your phone keyboard's built-in Mic icon directly inside the AI input box!"
      );
      return;
    }

    try {
      const rec = new SpeechRec();
      state.activeSpeechRec = rec;
      rec.lang = navigator.language && navigator.language.startsWith("hi") ? "hi-IN" : "en-IN";
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      let finalCaptured = "";

      rec.onstart = () => {
        state.isListeningVoice = true;
        updateMicDomStatus(true, "Listening... Speak now (Hindi / English)");
      };

      rec.onresult = (ev) => {
        let interim = "";
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const t = ev.results[i][0].transcript;
          if (ev.results[i].isFinal) {
            finalCaptured += t;
          } else {
            interim += t;
          }
        }
        const liveText = (finalCaptured || interim).trim();
        state.aiInputText = liveText;
        const inputEl = document.getElementById("ai-command-input");
        if (inputEl) {
          inputEl.value = liveText;
        }
        updateMicDomStatus(true, `Heard: "${liveText}"`);
      };

      rec.onerror = (ev) => {
        state.isListeningVoice = false;
        updateMicDomStatus(false, "Mic Ready (Tap to Speak)");
        if (ev.error === "not-allowed" || ev.error === "service-not-allowed") {
          setBanner(
            "error",
            "Microphone permission was blocked by the browser. Click the Lock/Tune icon in the address bar -> Allow Microphone, or open via http://localhost:8000."
          );
        } else if (ev.error !== "aborted" && ev.error !== "no-speech") {
          setBanner("error", `Microphone notice (${ev.error}). Try speaking again or type below.`);
        }
      };

      rec.onend = async () => {
        state.isListeningVoice = false;
        updateMicDomStatus(false, "Mic Ready (Tap to Speak)");
        const inputEl = document.getElementById("ai-command-input");
        const textToRun = (finalCaptured || (inputEl ? inputEl.value : "")).trim();
        if (textToRun) {
          await executeAiTranscript(textToRun);
        }
      };

      rec.start();
    } catch (err) {
      state.isListeningVoice = false;
      updateMicDomStatus(false, "Mic Ready");
      setBanner("error", `Could not start microphone: ${err.message}`);
    }
  }

  function bindDashboardEvents() {
    const dismissBtn = document.getElementById("dismiss-banner-btn");
    if (dismissBtn) dismissBtn.onclick = () => setBanner(null, null);

    document.querySelectorAll("[data-tab]").forEach((btn) => {
      btn.onclick = () => {
        state.activeTab = btn.getAttribute("data-tab");
        renderApp();
      };
    });

    const headerProfileChip = document.getElementById("header-profile-chip");
    if (headerProfileChip) {
      headerProfileChip.onclick = () => {
        state.activeTab = "profile";
        renderApp();
      };
    }

    const tzSelect = document.getElementById("user-tz-select");
    if (tzSelect) {
      tzSelect.onchange = async () => {
        const newTz = tzSelect.value;
        try {
          await apiRequest("/api/auth/timezone", {
            method: "PUT",
            body: JSON.stringify({ timezone: newTz })
          });
          state.timezone = newTz;
          state.user.timezone = newTz;
          await refreshHabitsAndStats();
          setBanner("success", `Time zone switched to ${newTz}. All streaks and dates recalculated.`);
        } catch (err) {
          setBanner("error", err.message);
        }
      };
    }

    const handleLogout = () => {
      state.token = null;
      state.user = null;
      localStorage.removeItem("hf_pern_token");
      renderApp();
    };

    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) logoutBtn.onclick = handleLogout;
    const profLogoutBtn = document.getElementById("profile-logout-btn");
    if (profLogoutBtn) profLogoutBtn.onclick = handleLogout;

    const openCreateModal = () => {
      state.editingHabit = null;
      state.selectedIcon = "bolt";
      state.modalOpen = true;
      renderApp();
    };
    const btnHome = document.getElementById("new-habit-btn-home");
    const btnTasks = document.getElementById("new-habit-btn-tasks");
    const btnFab = document.getElementById("floating-add-task-btn");
    if (btnHome) btnHome.onclick = openCreateModal;
    if (btnTasks) btnTasks.onclick = openCreateModal;
    if (btnFab) btnFab.onclick = openCreateModal;

    const handleTestNotification = async () => {
      const sent = await triggerPhoneNotification(
        "⚡ HabitFlow Reminder",
        "Your daily habits are synced and active! Tap to check off today's tasks."
      );
      speakAiReply("HabitFlow reminder notification is active on your device.");
      setBanner(
        "success",
        sent
          ? "Phone/Browser Notification triggered! You can also sync the .ICS feed with Google Calendar for native alarm reminders."
          : "Reminder chime played! Allow browser notifications or click '+ Google Calendar' on any habit for native phone alarms."
      );
    };
    const testNotifBtn = document.getElementById("test-phone-notif-btn");
    const profTestNotifBtn = document.getElementById("profile-test-notif-btn");
    if (testNotifBtn) testNotifBtn.onclick = handleTestNotification;
    if (profTestNotifBtn) profTestNotifBtn.onclick = handleTestNotification;

    const aiForm = document.getElementById("ai-command-form");
    if (aiForm) {
      aiForm.onsubmit = async (e) => {
        e.preventDefault();
        const val = document.getElementById("ai-command-input")?.value || "";
        await executeAiTranscript(val);
      };
    }

    document.querySelectorAll("[data-ai-sample]").forEach((chip) => {
      chip.onclick = async () => {
        const sample = chip.getAttribute("data-ai-sample");
        state.aiInputText = sample;
        await executeAiTranscript(sample);
      };
    });

    const micBtn = document.getElementById("ai-mic-trigger-btn");
    if (micBtn) {
      micBtn.onclick = () => startVoiceRecognition();
    }

    document.querySelectorAll("[data-action='toggle-checkin']").forEach((btn) => {
      btn.onclick = async () => {
        const habitId = Number(btn.getAttribute("data-habit-id"));
        const dateStr = btn.getAttribute("data-date");
        const rect = btn.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        try {
          const res = await apiRequest(`/api/habits/${habitId}/checkin`, {
            method: "POST",
            body: JSON.stringify({ date: dateStr })
          });
          playCheckinSound(res.action === "checked");
          if (res.action === "checked") {
            triggerConfettiBurst(cx, cy);
          }
          await refreshHabitsAndStats();
        } catch (err) {
          setBanner("error", err.message);
        }
      };
    });

    document.querySelectorAll("[data-action='edit-habit']").forEach((btn) => {
      btn.onclick = () => {
        const habitId = Number(btn.getAttribute("data-habit-id"));
        const found = state.habits.find((h) => h.id === habitId);
        if (found) {
          state.editingHabit = JSON.parse(JSON.stringify(found));
          state.selectedIcon = found.icon || "bolt";
          state.modalOpen = true;
          renderApp();
        }
      };
    });

    document.querySelectorAll("[data-action='archive-habit']").forEach((btn) => {
      btn.onclick = async () => {
        const habitId = Number(btn.getAttribute("data-habit-id"));
        try {
          const res = await apiRequest(`/api/habits/${habitId}/archive`, { method: "POST" });
          await refreshHabitsAndStats();
          setBanner("success", res.message);
        } catch (err) {
          setBanner("error", err.message);
        }
      };
    });

    document.querySelectorAll("[data-action='restore-habit']").forEach((btn) => {
      btn.onclick = async () => {
        const habitId = Number(btn.getAttribute("data-habit-id"));
        try {
          const res = await apiRequest(`/api/habits/${habitId}/restore`, { method: "POST" });
          await refreshHabitsAndStats();
          setBanner("success", res.message);
        } catch (err) {
          setBanner("error", err.message);
        }
      };
    });

    document.querySelectorAll("[data-action='delete-habit']").forEach((btn) => {
      btn.onclick = async () => {
        const habitId = Number(btn.getAttribute("data-habit-id"));
        try {
          const res = await apiRequest(`/api/habits/${habitId}`, { method: "DELETE" });
          await refreshHabitsAndStats();
          setBanner("success", res.message);
        } catch (err) {
          setBanner("error", err.message);
        }
      };
    });

    document.querySelectorAll("[data-avatar-key]").forEach((btn) => {
      btn.onclick = () => {
        state.selectedAvatar = btn.getAttribute("data-avatar-key");
        renderApp();
      };
    });

    const fileInput = document.getElementById("profile-pic-file-input");
    if (fileInput) {
      fileInput.onchange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        if (file.size > 250 * 1024) {
          setBanner("error", "Please choose an image smaller than 250 KB.");
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          state.selectedAvatar = String(reader.result);
          renderApp();
        };
        reader.readAsDataURL(file);
      };
    }

    const profForm = document.getElementById("profile-customize-form");
    if (profForm) {
      profForm.onsubmit = async (e) => {
        e.preventDefault();
        const name = (document.getElementById("prof-name")?.value || "").trim();
        const bio = (document.getElementById("prof-bio")?.value || "").trim();
        const timezone = document.getElementById("prof-tz")?.value || state.timezone;
        try {
          const res = await apiRequest("/api/profile", {
            method: "PUT",
            body: JSON.stringify({
              name,
              bio,
              timezone,
              avatar_url: state.selectedAvatar
            })
          });
          state.user = res.user;
          state.timezone = res.user.timezone;
          await refreshHabitsAndStats();
          setBanner("success", res.message);
        } catch (err) {
          setBanner("error", err.message);
        }
      };
    }

    if (state.modalOpen) {
      const closeBtn = document.getElementById("close-modal-btn");
      const cancelBtn = document.getElementById("cancel-modal-btn");
      if (closeBtn) closeBtn.onclick = () => { state.modalOpen = false; renderApp(); };
      if (cancelBtn) cancelBtn.onclick = () => { state.modalOpen = false; renderApp(); };

      document.querySelectorAll("[data-icon-key]").forEach((btn) => {
        btn.onclick = () => {
          state.selectedIcon = btn.getAttribute("data-icon-key");
          document.querySelectorAll("[data-icon-key]").forEach((b) => b.classList.remove("selected"));
          btn.classList.add("selected");
        };
      });

      const schedTypeSelect = document.getElementById("h-sched-type");
      const weekdaysGroup = document.getElementById("weekdays-group");
      const targetGroup = document.getElementById("target-group");
      if (schedTypeSelect) {
        schedTypeSelect.onchange = () => {
          const v = schedTypeSelect.value;
          if (weekdaysGroup) weekdaysGroup.style.display = v === "weekdays" ? "block" : "none";
          if (targetGroup) targetGroup.style.display = v === "times_per_week" ? "block" : "none";
        };
      }

      document.querySelectorAll(".wk-btn").forEach((b) => {
        b.onclick = () => b.classList.toggle("selected");
      });

      const habitForm = document.getElementById("habit-form");
      if (habitForm) {
        habitForm.onsubmit = async (e) => {
          e.preventDefault();
          const name = document.getElementById("h-name")?.value || "";
          const description = document.getElementById("h-desc")?.value || "";
          const icon = state.selectedIcon || "bolt";
          const color = document.getElementById("h-color")?.value || "#6366f1";
          const schedule_type = document.getElementById("h-sched-type")?.value || "daily";
          const target_per_week = Number(document.getElementById("h-target")?.value || 7);
          const reminder_enabled = Boolean(document.getElementById("h-rem-enabled")?.checked);
          const reminder_time = document.getElementById("h-rem-time")?.value || null;

          const schedule_days = [];
          document.querySelectorAll(".wk-btn.selected").forEach((b) => {
            schedule_days.push(Number(b.getAttribute("data-weekday")));
          });

          const payload = {
            name,
            description,
            icon,
            color,
            schedule_type,
            schedule_days,
            target_per_week,
            reminder_enabled,
            reminder_time: reminder_enabled ? reminder_time : null
          };

          try {
            if (state.editingHabit && state.editingHabit.id) {
              const res = await apiRequest(`/api/habits/${state.editingHabit.id}`, {
                method: "PUT",
                body: JSON.stringify(payload)
              });
              state.modalOpen = false;
              await refreshHabitsAndStats();
              setBanner("success", res.message);
            } else {
              const res = await apiRequest("/api/habits", {
                method: "POST",
                body: JSON.stringify(payload)
              });
              state.modalOpen = false;
              await refreshHabitsAndStats();
              setBanner("success", res.message);
            }
          } catch (err) {
            setBanner("error", err.message);
          }
        };
      }
    }
  }

  (async function init() {
    await verifyServerOwnership();
    startLiveReminderDaemon();
    if (state.token) {
      await loadAuthenticatedData();
    } else {
      renderApp();
    }
  })();
})();