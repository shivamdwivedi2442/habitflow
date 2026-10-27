/* Engineered by Shivam Coder (https://github.com/shivamdwivedi2442 */
(function () {
  "use strict";

  const SVG_MAP = {
    // Brand & Task Icons
    bolt: (size = 20, cls = "svg-anim-pulse") => `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="hf-svg ${cls}" xmlns="http://www.w3.org/2000/svg">
        <path d="M13 2L4.09 12.63C3.74 13.04 3.57 13.25 3.56 13.43C3.56 13.59 3.63 13.74 3.76 13.84C3.91 13.95 4.18 13.95 4.72 13.95H12L11 22L19.91 11.37C20.26 10.96 20.43 10.75 20.44 10.57C20.44 10.41 20.37 10.26 20.24 10.16C20.09 10.05 19.82 10.05 19.28 10.05H12L13 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="currentColor" fill-opacity="0.18"/>
      </svg>`,

    code: (size = 20, cls = "svg-anim-float") => `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="hf-svg ${cls}" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 18L22 12L16 6M8 6L2 12L8 18M14 4L10 20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,

    dumbbell: (size = 20, cls = "svg-anim-bounce") => `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="hf-svg ${cls}" xmlns="http://www.w3.org/2000/svg">
        <path d="M6.5 6.5L17.5 17.5M3 10L10 3M14 21L21 14M2 6L6 2M18 22L22 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,

    rocket: (size = 20, cls = "svg-anim-float") => `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="hf-svg ${cls}" xmlns="http://www.w3.org/2000/svg">
        <path d="M4.5 16.5C3 17.76 2.5 21.5 2.5 21.5C2.5 21.5 6.24 21 7.5 19.5C8.21 18.66 8.2 17.37 7.41 16.59C6.63 15.8 5.34 15.79 4.5 16.5Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M12 15L9 12C10.5 7.5 14.5 4 21 3C20 9.5 16.5 13.5 12 15Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="currentColor" fill-opacity="0.15"/>
        <circle cx="15" cy="9" r="1.5" fill="currentColor"/>
      </svg>`,

    shield: (size = 20, cls = "svg-anim-pulse") => `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="hf-svg ${cls}" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="currentColor" fill-opacity="0.15"/>
        <path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,

    book: (size = 20, cls = "svg-anim-float") => `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="hf-svg ${cls}" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5V19.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="currentColor" fill-opacity="0.12"/>
      </svg>`,

    droplet: (size = 20, cls = "svg-anim-bounce") => `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="hf-svg ${cls}" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2.69L17.66 8.35C20.78 11.47 20.78 16.53 17.66 19.65C14.54 22.77 9.46 22.77 6.34 19.65C3.22 16.53 3.22 11.47 6.34 8.35L12 2.69Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="currentColor" fill-opacity="0.18"/>
      </svg>`,

    heart: (size = 20, cls = "svg-anim-pulse") => `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="hf-svg ${cls}" xmlns="http://www.w3.org/2000/svg">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="currentColor" fill-opacity="0.18"/>
      </svg>`,

    target: (size = 20, cls = "svg-anim-spin-slow") => `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="hf-svg ${cls}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
        <circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="2" stroke-dasharray="4 2"/>
        <circle cx="12" cy="12" r="2" fill="currentColor"/>
      </svg>`,

    sparkle: (size = 20, cls = "svg-anim-pulse") => `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="hf-svg ${cls}" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L14.8 9.2L22 12L14.8 14.8L12 22L9.2 14.8L2 12L9.2 9.2L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="currentColor" fill-opacity="0.2"/>
      </svg>`,

    flame: (size = 20, cls = "svg-anim-flicker") => `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="hf-svg ${cls}" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 22C16.97 22 20 18.5 20 14C20 8.5 14.5 4.5 12.5 2C12 5.5 9.5 7.5 8 7.5C6.5 4.5 4 9 4 14C4 18.5 7.03 22 12 22Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="currentColor" fill-opacity="0.22"/>
      </svg>`,

    trophy: (size = 20, cls = "svg-anim-float") => `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="hf-svg ${cls}" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 9H4.5C3.12 9 2 7.88 2 6.5V5H6M18 9H19.5C20.88 9 22 7.88 22 6.5V5H18M8 21H16M12 17V21M6 3H18V10C18 13.31 15.31 16 12 16C8.69 16 6 13.31 6 10V3Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="currentColor" fill-opacity="0.16"/>
      </svg>`,

    sun: (size = 20, cls = "svg-anim-spin-slow") => `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="hf-svg ${cls}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity="0.2"/>
        <path d="M12 1V3M12 21V23M4.22 4.22L5.64 5.64M18.36 18.36L19.78 19.78M1 12H3M21 12H23M4.22 19.78L5.64 18.36M18.36 5.64L19.78 4.22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,

    moon: (size = 20, cls = "svg-anim-float") => `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="hf-svg ${cls}" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="currentColor" fill-opacity="0.18"/>
      </svg>`,

    // Navigation & UI Action Icons (4 Bottom Tabs + AI Voice + Controls)
    home: (size = 20, cls = "") => `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="hf-svg ${cls}" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 9.5L12 2L21 9.5V20C21 21.1 20.1 22 19 22H5C3.9 22 3 21.1 3 20V9.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M9 22V12H15V22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,

    tasks: (size = 20, cls = "") => `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="hf-svg ${cls}" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="4" width="18" height="18" rx="3" stroke="currentColor" stroke-width="2"/>
        <path d="M8 12L11 15L16 9" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,

    stats: (size = 20, cls = "") => `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="hf-svg ${cls}" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 20V10M12 20V4M6 20V14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,

    profile: (size = 20, cls = "") => `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="hf-svg ${cls}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="2"/>
        <path d="M4 21C4 17.13 7.58 14 12 14C16.42 14 20 17.13 20 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,

    plus: (size = 20, cls = "") => `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="hf-svg ${cls}" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,

    check: (size = 16, cls = "") => `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="hf-svg ${cls}" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,

    mic: (size = 20, cls = "svg-anim-pulse") => `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="hf-svg ${cls}" xmlns="http://www.w3.org/2000/svg">
        <rect x="9" y="2" width="6" height="11" rx="3" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity="0.2"/>
        <path d="M19 10V11C19 14.87 15.87 18 12 18C8.13 18 5 14.87 5 11V10M12 18V22M8 22H16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,

    bell: (size = 15, cls = "svg-anim-bounce") => `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="hf-svg ${cls}" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 8A6 6 0 0 0 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8ZM13.73 21A2 2 0 0 1 10.27 21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,

    globe: (size = 16, cls = "svg-anim-spin-slow") => `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="hf-svg ${cls}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
        <path d="M2 12H22M12 2C14.5 4.74 15.92 8.29 16 12C15.92 15.71 14.5 19.26 12 22C9.5 19.26 8.08 15.71 8 12C8.08 8.29 9.5 4.74 12 2Z" stroke="currentColor" stroke-width="1.8"/>
      </svg>`,

    edit: (size = 15, cls = "") => `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="hf-svg ${cls}" xmlns="http://www.w3.org/2000/svg">
        <path d="M11 4H4C2.9 4 2 4.9 2 6V20C2 21.1 2.9 22 4 22H18C19.1 22 20 21.1 20 20V13M18.5 2.5C19.33 1.67 20.67 1.67 21.5 2.5C22.33 3.33 22.33 4.67 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,

    archive: (size = 15, cls = "") => `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="hf-svg ${cls}" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="3" width="20" height="5" rx="1" stroke="currentColor" stroke-width="2"/>
        <path d="M4 8V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8M10 12H14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,

    restore: (size = 15, cls = "") => `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="hf-svg ${cls}" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 12C3 7.03 7.03 3 12 3C15.3 3 18.19 4.78 19.75 7.43M21 3V8H16M21 12C21 16.97 16.97 21 12 21C8.7 21 5.81 19.22 4.25 16.57M3 21V16H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,

    trash: (size = 15, cls = "") => `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="hf-svg ${cls}" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 6H21M19 6V20C19 21.1 18.1 22 17 22H7C5.9 22 5 21.1 5 20V6M8 6V4C8 2.9 8.9 2 10 2H14C15.1 2 16 2.9 16 4V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`
  };

  // Pre-built Animated Vector Avatar Presets
  const AVATAR_PRESETS = {
    avatar_cyber_indigo: `
      <svg viewBox="0 0 64 64" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="av1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#6366f1"/>
            <stop offset="100%" stop-color="#a855f7"/>
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="30" fill="url(#av1)"/>
        <circle cx="32" cy="24" r="10" fill="#f8fafc"/>
        <path d="M14 54C16 43 23 38 32 38C41 38 48 43 50 54" fill="#f8fafc"/>
      </svg>`,
    avatar_emerald_neon: `
      <svg viewBox="0 0 64 64" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="av2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#10b981"/>
            <stop offset="100%" stop-color="#06b6d4"/>
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="30" fill="url(#av2)"/>
        <circle cx="32" cy="24" r="10" fill="#052e16"/>
        <path d="M14 54C16 43 23 38 32 38C41 38 48 43 50 54" fill="#052e16"/>
      </svg>`,
    avatar_solar_amber: `
      <svg viewBox="0 0 64 64" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="av3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#f59e0b"/>
            <stop offset="100%" stop-color="#ef4444"/>
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="30" fill="url(#av3)"/>
        <circle cx="32" cy="24" r="10" fill="#ffffff"/>
        <path d="M14 54C16 43 23 38 32 38C41 38 48 43 50 54" fill="#ffffff"/>
      </svg>`,
    avatar_crimson_pulse: `
      <svg viewBox="0 0 64 64" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="av4" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ec4899"/>
            <stop offset="100%" stop-color="#6366f1"/>
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="30" fill="url(#av4)"/>
        <circle cx="32" cy="24" r="10" fill="#f8fafc"/>
        <path d="M14 54C16 43 23 38 32 38C41 38 48 43 50 54" fill="#f8fafc"/>
      </svg>`
  };

  function renderSvgIcon(key, size = 20, extraClass = "") {
    const fn = SVG_MAP[String(key || "bolt").toLowerCase()] || SVG_MAP.bolt;
    return fn(size, extraClass);
  }

  function renderUserAvatar(avatarUrl, userName = "User", size = 36) {
    const val = String(avatarUrl || "").trim();
    if (val.startsWith("data:image/") || val.startsWith("http://") || val.startsWith("https://")) {
      return `<img src="${val}" alt="${userName}" class="user-avatar-img" style="width:${size}px;height:${size}px;border-radius:999px;object-fit:cover;border:2px solid #6366f1;" />`;
    }
    const presetSvg = AVATAR_PRESETS[val] || AVATAR_PRESETS.avatar_cyber_indigo;
    return `<div class="user-avatar-svg" style="width:${size}px;height:${size}px;border-radius:999px;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;border:2px solid rgba(99,102,241,0.6);">${presetSvg}</div>`;
  }

  window.HabitFlowSVGs = {
    renderSvgIcon,
    renderUserAvatar,
    ICON_KEYS: [
      "bolt",
      "code",
      "dumbbell",
      "rocket",
      "shield",
      "book",
      "droplet",
      "heart",
      "target",
      "sparkle",
      "flame",
      "trophy",
      "sun",
      "moon"
    ],
    AVATAR_KEYS: Object.keys(AVATAR_PRESETS)
  };
})();
