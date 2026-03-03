# 🚀 ADHD Trip Planner

A high-performance, mobile-first Web Application designed for streamlined travel planning. This tool is built with a focus on ease of use, offline reliability, and a premium **Shadcn UI** aesthetic.

![Version](https://img.shields.io/badge/version-1.0.3-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![PWA](https://img.shields.io/badge/PWA-Ready-orange)

## ✨ Features

- 📅 **Smart Journey Builder**: Automatically pre-fills the next step's starting point from your previous destination.
- 🛠️ **Preparation Steps**: Dedicated "Prep" mode for packing lists, visa checks, or tasks before you hit the road.
- 📱 **Mobile-First Design**: Optimized for vertical phone screens with touch-friendly interactions and tactile feedback.
- 🎨 **Shadcn UI Aesthetic**: A clean, minimalist interface using an HSL-based design system (Zinc/Slate palette).
- 📶 **Offline Support (PWA)**: Works without an internet connection using an advanced Service Worker cache strategy.
- 💾 **Local Persistence**: All data is stored securely in your browser's LocalStorage.
- ⚙️ **Customizable Formats**: Toggle between `DD/MM/YYYY`, `MM/DD/YYYY`, and `YYYY-MM-DD` dates, plus 12h/24h time formats.
- 📤 **Data Portability**: Robust JSON Import/Export with standardized formatting for reliable backups.

## 🛠️ Technology Stack
- **Frontend**: Vanilla JS (ES6+), HTML5
- **Styling**: **Tailwind CSS v4** (Built with **Bun**)
- **State**: `localStorage` Persistence
- **Icons**: Lucide Icons
- **PWA**: manifest.json + Service Worker (v1.0.3)

---

## 🚀 Setup & Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/hadealahmad/adhdtripplanner.git
   ```

2. **Install dependencies**:
   ```bash
   bun install
   ```

3. **Run Development Mode (Tailwind Watch)**:
   ```bash
   bun run dev
   ```

4. **Production Build**:
   ```bash
   bun run build
   ```

5. **Start Local Server** (Required for PWA testing):
   ```bash
   python3 -m http.server 8000
   ```

## 📂 Project Structure

- `src/input.css`: The source CSS file for Tailwind.
- `style.css`: The generated, minified CSS used by the app.
- `app.js`: State management, rendering logic, and event handling.
- `sw.js`: Service Worker for offline caching and version management.
- `manifest.json`: PWA manifest for "Add to Home Screen" support.

## 🔒 Privacy & Data

All your trip data stays strictly on your device. The application does not use any tracking, cookies, or external databases.

---
Built with ❤️ for better travel experiences.
