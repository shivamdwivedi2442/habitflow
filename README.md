<div align="center">

# ⚡ HabitFlow v3.0 
### *The Next-Generation Full-Stack Habit & Daily Task Tracking Platform*

**Architect & Lead Engineer:** **Shivam Dwivedi** ([@shivamdwivedi2442](https://github.com/shivamdwivedi2442))  
**Portfolio:** [shivamcoder-portfolio.netlify.app](https://shivamcoder-portfolio.netlify.app) | **GitHub:** [github.com/shivamdwivedi2442](https://github.com/shivamdwivedi2442)

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.x-green.svg?style=flat-square&logo=nodedotjs)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-blue.svg?style=flat-square&logo=postgresql)](https://supabase.com/)
[![React Native](https://img.shields.io/badge/React%20Native-Expo-000?style=flat-square&logo=react)](https://expo.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

*Built with PostgreSQL + Supabase, Node.js + Express, and a Universal React + React Native (Expo) frontend powered by bilingual AI voice recognition, cryptographic OTP security, and Google Calendar synchronization.*

</div>

---

## 🌟 What's New in v3.0

1. **🎙️ Microphone Fix & Live Audio Feedback**: Updated security headers (`Permissions-Policy: microphone=(self)`) and optimized live DOM rendering during speech recognition, complete with `window.speechSynthesis` text-to-speech AI replies.
2. **✉️ Nodemailer OTP Integration**: Automated 6-digit cryptographic authentication via SMTP, with seamless fallback to instant developer dev previews.
3. **🧠 Advanced Specific-Day AI Parsing**: Natural language processing for past check-ins (*"kal ka brush ho gya"*, *"2026-10-25 ka gym done"*), specific weekdays (*"mon wed fri gym"*), and voice-driven task deletion (*"brush wala task hata do"*).
4. **📱 Phone Gemini / Google Assistant Webhook**: Direct REST endpoint (`/api/gemini/webhook`) secured with your personal API key to control your habits hands-free from any mobile assistant or shortcut.
5. **📅 Google Calendar & `.ICS` Live Feed**: Export your full schedule with recurring `RRULE` patterns and 10-minute `VALARM` notifications directly into Google Calendar or Apple Calendar.
6. **⚡ Lazy-Loading & Performance**: `IntersectionObserver` lazy-hydrating 6-month (182-day) heatmaps and cards for instantaneous mobile startup.

---

## 🧭 Core Architecture & UI Highlights

* **4-Button Mobile Bottom Navigation Bar + FAB**: Dedicated tabs for **Home** (KPIs + 6-Month Heatmaps), **Tasks** (Daily Task Checklist + instant `+ Add New Task`), **Stats** (30-Day Completion Rate Analytics), and **Profile** (Custom photo uploads, animated vector avatars, and timezone configuration).
* **Bilingual AI Voice & Text Assistant**: Speak or type natural commands in Hindi, Hinglish, or English to create, complete, or delete habits instantly.
* **100% Animated Vector SVGs**: Zero plain emojis—every icon uses custom keyframe-animated vectors (`frontend/public/svgIcons.js`).
* **Cryptographic Security**: PBKDF2-HMAC-SHA256 password hashing, rate-limited endpoints, and secure cookie handling.

---

## 🚀 Quick Start Guide

### 1. Clone & Configure Environment
```bash
git clone https://github.com/shivamdwivedi2442/habitflow.git
cd habitflow
cp .env.example .env
```

### 2. Seed 6 Months of Demo Data
```bash
npm run seed
```
*(Note: Running `npm start` also auto-seeds the database on first boot if empty).*

### 3. Start the Full-Stack Server
```bash
npm start
```
Open **`http://localhost:8000`** in your web browser or mobile simulator.

### 4. Run Automated Backend Tests (12 Test Suites)
```bash
npm test
```

### 5. Run the Universal Expo Mobile App (Optional)
```bash
cd mobile-expo
npm install
npx expo start
```

---

## 🔑 Demo Accounts & Quick Login

You can sign in using **Password**, **6-Digit OTP Verification** (auto-previews in demo mode), or **1-Click Demo Login**:

| Account Type | Email | Password | Time Zone | Highlights |
| :--- | :--- | :--- | :--- | :--- |
| **Primary (Shivam Coder)** | `shivam@habitflow.dev` | `Shivam@2442` | `Asia/Kolkata` | 4 active habits across Daily, Mon/Wed/Fri, Tue/Thu/Sat + 6 months of historical check-ins |
| **Secondary (Alex Rivera)** | `demo@habitflow.dev` | `DemoPass123!` | `America/New_York` | US Eastern Time zone demo with a 14-day active streak |

---

## 🎙️ AI Voice & Text Assistant Cheat Sheet

Tap the microphone button or type into the AI bar on the **Home** or **Tasks** tab:

* **Add Daily Task:**  
  > *"roj subah brush krna h ye add kr do task"* $\rightarrow$ Creates **Morning Brush** (`daily`, reminder `07:30`, `sparkle` SVG).
* **Complete Past or Present Check-in:**  
  > *"brush ho gya"* (Today) | *"kal ka brush ho gya"* (Yesterday) | *"2026-10-25 ka gym done"* (Specific Date).
* **Add Custom Weekdays:**  
  > *"mon wed fri yoga krna hai add task"* $\rightarrow$ Schedules for Monday, Wednesday, and Friday.
* **Remove / Delete Task:**  
  > *"brush wala task hata do"* $\rightarrow$ Safely removes the habit and associated logs.

---

## 🗄️ Database Schema (`Supabase / PostgreSQL`)

1. **`users`**: Manages account credentials, timezones, avatars, and verification status.
2. **`otp_codes`**: Stores PBKDF2-hashed 6-digit verification codes with expiration timers.
3. **`habits`**: Tracks habit configuration, recurrence rules (`schedule_type`, `schedule_days`, `target_per_week`), and icons.
4. **`checkins`**: Enforces a unique constraint (`UNIQUE(habit_id, checkin_date)`) for daily and recurring completion logs.
5. **`ai_logs`**: Logs voice/text transcripts, parsed intents, and assistant replies for auditing.

---

## 📱 Building the Installable Android `.APK` (`mobile-expo/`)

The `mobile-expo/` directory includes full EAS configuration (`eas.json`), app manifests (`app.json`), and custom adaptive icons.

### Option A: Build in the Cloud via EAS (Recommended)
```bash
cd mobile-expo
npm install
npx eas-cli login
npm run build:apk:cloud
```
*EAS will generate a direct download link and QR code for your installable `.apk` file.*

### Option B: Build Locally (Requires Android SDK & Java 17)
```bash
cd mobile-expo
npm install
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
```
Your compiled `.apk` will be outputted to:  
`mobile-expo/android/app/build/outputs/apk/release/app-release.apk`

---

<div align="center">

⭐ **If you find HabitFlow useful, consider giving it a star on GitHub!**

</div>