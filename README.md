# AetherCommerce — Interactive HCI Research Testbed

**Live Demo (Public Evaluation Mode):** [https://aethercommerce-blue.vercel.app](https://aethercommerce-blue.vercel.app)

An interactive Human-Computer Interaction (HCI) research testbed investigating how deceptive e-commerce "dark patterns" impact human cognitive load, decision latency, accidental add-on conversions, and calibrated trust compared to a calm, neuro-adaptive checkout architecture.

---

## Research Overview & Theoretical Grounding
- **Experimental Design:** Counterbalanced within-subjects A/B checkout study (`AB` vs. `BA` sequence assignment) with IRB-aligned informed consent and immediate post-task debriefing.
- **Mode A (Baseline Dark-Pattern UI):** Simulates temporal scarcity (`01:59` countdown, low-stock banners), pre-checked defaults (`+$25` extended warranty), low-contrast opt-out links, and last-step drip pricing (`$207 → $263`).
- **Mode B (Ethical Neuro-Adaptive UI):** Eliminates artificial urgency and pre-checked traps, isolates a `48px+` primary action target, and guarantees upfront price-lock transparency (`$207 → $207`).
- **Cognitive Frameworks:** Hick's Law, Fitts's Law, Sweller's Cognitive Load Theory, and Kahneman's Dual-Process Theory.
- **Ecological Validity:** Features a scroll-linked Three.js interactive 3D studio (`AETHER ONE` reference headphones) to establish realistic product attachment before introducing checkout friction.

---

## Project Architecture

```text
├── apps-script/
│   └── Code.gs                     # Google Apps Script REST endpoint for controlled telemetry
├── public/                         # Static 3D assets & studio environment
└── src/
    ├── app/
    │   ├── layout.tsx              # Typography, metadata, and global shell
    │   ├── page.tsx                # Main research testbed entry & drawer state
    │   └── globals.css             # Tailwind styling & GPU scroll optimization
    ├── components/
    │   ├── Navbar.tsx              # Glassmorphic navigation & section links
    │   ├── Hero.tsx                # Editorial hero & cognitive principles marquee
    │   ├── Headphone3D.tsx         # Interactive Three.js / R3F 3D product studio
    │   ├── StorefrontSandbox.tsx   # Mode A vs. Mode B checkout, consent, survey & debrief
    │   ├── UXPrinciples.tsx        # Interactive Framer Motion cognitive law micro-demos
    │   └── CaseStudyDrawer.tsx     # 3-tab HCI evaluation file, live results & .CSV export
    ├── data/
    │   ├── finishes.ts             # Adaptive studio material & pedestal presets
    │   └── mockData.ts             # Product specs, pricing breakdowns & benchmark metrics
    └── lib/
        └── sheet.ts                # Telemetry logging & ?study=1 dataset isolation
```

---

## Local Development & Deployment

1. **Install Dependencies:**
   ```bash
   npm install
   ```
2. **Configure Telemetry Environment Variable:**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SHEET_URL=your_google_apps_script_web_app_url
   ```
3. **Run Locally:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) (append `/?study=1` to test controlled study logging).

---

## Author
**Gayathri Mohandas** — Prospective M.S. Researcher in Human-Computer Interaction & Interaction Science
