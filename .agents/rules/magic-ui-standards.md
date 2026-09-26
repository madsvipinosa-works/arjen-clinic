---
description: Design principles and UI standards inspired by Magic UI and 21st.dev for AR-JEN Clinic
trigger: always_on
---

# Magic UI & 21st.dev Design Standards for AR-JEN Clinic

All newly generated or refactored UI components across the clinic portal must adhere to modern industry standards inspired by **Magic UI** (https://magicui.design) and **21st.dev** (https://21st.dev):

### 1. Visual Hierarchy & Surface Design
- **Subtle Glassmorphism & Soft Borders:** Use `bg-white/80 backdrop-blur-md border border-gray-200/80` or `bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200`.
- **Curated Gradients:** Avoid flat, harsh colors. Use soft radial/linear gradients (e.g., `from-rose-500 to-rose-600`, `from-rose-50 via-white to-gray-50`).
- **Bento Grid Cards:** Structure information into modular, asymmetric bento-box cards with clean padding (`p-5 md:p-6`) and rounded corners (`rounded-2xl` or `rounded-3xl`).

### 2. Micro-Interactions & Transitions
- **Hover Micro-Animations:** Buttons and interactive pills should feature smooth scale/translate effects (`group-hover:translate-x-0.5`, `active:scale-[0.98]`, `transition-all duration-200`).
- **Pill Badges:** Use rounded-full badges with subtle border tints and uppercase tracking (e.g., `text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full`).
- **Live Status Dots:** For real-time updates and active states, use animated pulsing indicators (`relative flex h-2 w-2` with `animate-ping`).

### 3. Clinical Ergonomics & Readability
- **3-Second Situational Awareness:** High-priority clinical metrics (AOG, Trimester, Risk Flags, EDC) must be visible immediately above the fold.
- **Progressive Disclosure:** Keep dense multi-field forms tucked into smooth collapsible panels or slide-overs rather than dominating the primary screen.
