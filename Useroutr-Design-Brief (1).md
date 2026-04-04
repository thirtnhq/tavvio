
| Useroutr UI / UX Design Brief Full-Stack Payment Infrastructure Platform Stellar Blockchain · Fiat \+ Crypto Rails Prepared for: Lead UI/UX Designer Version 1.0  ·  February 2026 |
| ----- |

| How to use this document |
| :---- |
| This brief is your single source of truth for the Useroutr design project. Read it cover to cover before opening a single frame in Figma. Every section has been written to eliminate ambiguity — from brand values to micro-interaction expectations. When in doubt, return here first. |

**01  ·  PROJECT OVERVIEW**

# **Project Overview**

Useroutr is a full-stack payment infrastructure platform that unifies fiat and cryptocurrency payment rails into a single, developer-friendly SDK — settled on the Stellar blockchain.

The product is simultaneously a developer tool and a business dashboard, serving two distinct audiences who interact with the same underlying infrastructure in fundamentally different ways.

| Attribute | Detail |
| :---- | :---- |
| Project Name | Useroutr |
| Product Type | B2B & B2C Payment Infrastructure Platform |
| Tagline | Pay anything. Settle everywhere. |
| Blockchain | Stellar (Soroban smart contracts) |
| Primary Users | Developers, Businesses, End Consumers |
| Core Products | Gateway · Payment Links · Invoicing · Payouts · On/Off Ramp |
| Design Deliverable | Full product UI — web app \+ marketing site \+ component library |
| Primary Platform | Web (desktop-first, mobile-responsive) |
| Design Tool | Figma (with auto-layout, variables, and component library) |
| Handoff | Figma Dev Mode \+ annotated specs |

## **The Design Problem**

Useroutr needs to look and feel like a platform that developers trust with their infrastructure and business owners trust with their money. These two audiences have different mental models, different vocabularies, and different success metrics — yet they use the same product. The design challenge is building a visual system that serves both without compromising either.

Additionally, the product sits at the intersection of traditional finance (familiar, trustworthy, conservative) and crypto infrastructure (modern, technical, fast-moving). The visual language must bridge these two worlds — credible enough for a CFO, clean enough for an engineer, and intuitive enough for a small business owner paying an invoice.

**02  ·  USER PERSONAS**

# **Target Audiences**

Useroutr has three distinct user types. Design decisions must always be pressure-tested against all three. Never optimize for one at the expense of another without a deliberate, documented reason.

| 👨‍💻  The Developer | 🏢  The Business Owner | 👤  The End Consumer |
| :---- | :---- | :---- |
| **Role: Backend/Fullstack Engineer** Goal: Integrate Useroutr into their product quickly with minimal friction and maximum flexibility. **Needs:** Clean API docs & code examples API key management dashboard Sandbox/test environment Webhook inspector & logs Error messages that explain why, not just what **Frustration:** Opaque APIs, poor error states, no sandbox, and docs that assume too much prior knowledge. | **Role: Founder, Finance Lead, Ops Manager** Goal: Accept payments globally, send payouts, and get a clear view of business finances without complexity. **Needs:** Transaction history & export Revenue analytics dashboard Payment link/invoice creator Payout management Multi-currency balance view **Frustration:** Crypto complexity leaking into the UI. Unclear status labels. No clean export for accounting. | **Role: Customer of a Useroutr-powered business** Goal: Pay for something quickly, in whatever form of money they have — card, bank, or crypto wallet. **Needs:** Frictionless checkout Transparent conversion rates Clear payment confirmation Mobile-optimized flow Trust signals throughout **Frustration:** Confusing crypto jargon in checkout. Unclear final amount. Slow confirmation screens. |

**03  ·  PRODUCTS TO DESIGN**

# **Screens & Products**

Useroutr consists of five product modules plus a public marketing site. Each module has its own primary user, flow, and design priority. The full design scope covers all six areas.

## **3.1  Marketing Website (useroutr.io)**

The public-facing landing page and documentation site. This is the first impression for both developers and business owners. It must immediately communicate what Useroutr does, why it matters, and how to get started.

| Homepage / Landing Page Hero section with headline, 2-sentence value prop, CTA (Join Waitlist, Try It Out, View Docs). Below the fold: product overview, key differentiators, supported chains/currencies grid, testimonials section, and a video demo block. Footer with 'A product of thirtn.com'.  Marketing  High Priority  Conversion-Critical  |
| :---- |

| Documentation Hub (docs.useroutr.io) Developer-facing documentation site. Left sidebar navigation tree, right-side content area with code blocks, copy-to-clipboard, language switcher (JS/Python/Go), and an API reference explorer. Dark and light mode required.  Dev-Facing  High Priority  Dual Theme  |
| :---- |

## **3.2  Merchant Dashboard (dashboard.useroutr.io)**

The primary interface for business owners and their teams. This is where merchants manage their payment operations day-to-day. Desktop-first, with responsive mobile support.

| Overview / Home Real-time revenue summary, volume graphs, recent transactions, quick-action shortcuts (Create Link, Send Payout, Create Invoice). Greeting with business name. Balance widget showing settlement assets.  Dashboard  Data-Viz  High Priority  |
| :---- |

| Transactions Paginated list of all transactions with search, multi-filter (status, date, currency, type), sortable columns, and an expandable row/drawer for full transaction detail. Export to CSV/PDF.  Data Table  Filter-Heavy  Core Screen  |
| :---- |

| Payment Links Create/manage shareable payment links. Form for amount, currency, expiry, single/multi-use. List view with status badges. QR code display modal. Copy link and share options.  No-Code Tool  Creator Flow  |
| :---- |

| Invoicing Invoice builder with line items, tax, discount fields. Client detail fields. PDF preview panel. Send flow (email with custom message). Invoice list with status tracking (Draft/Sent/Viewed/Paid/Overdue).  No-Code Tool  Document Builder  |
| :---- |

| Payouts Single and bulk payout initiation. Recipient management (bank, mobile money, crypto wallet). Bulk upload via CSV. Payout status tracking. Scheduled and recurring payout configuration.  High Complexity  Bulk Operations  |
| :---- |

| On/Off Ramp Fiat → Crypto and Crypto → Fiat conversion flow. Rate quote widget. KYC status indicator. Transaction history for ramp flows. White-label preview (for platform clients).  Conversion Flow  KYC Touch  |
| :---- |

| Analytics Revenue over time (line/bar chart), conversion rate by payment method, payout volume, failure rate heatmap, top currencies. Date range picker. Exportable charts.  Data-Viz  Business Intelligence  |
| :---- |

| Settings API key management (generate, rotate, delete). Webhook endpoint config with event checkboxes and delivery logs. Team members and role management. Branding (logo, color for hosted checkout). Compliance / KYC status.  Config  Multi-Tab  |
| :---- |

## **3.3  Hosted Checkout (checkout.useroutr.io)**

The payment-facing surface that end consumers see when paying through a Useroutr-powered business. Must be clean, trustworthy, and optimized for conversion. This is mobile-first.

| Checkout Flow — Step 1: Method Selection Show merchant logo and order summary. Payment method selector tabs: Card / Bank Transfer / Crypto. Real-time conversion rate if paying in crypto. Trust badges and security note.  Consumer-Facing  Mobile-First  Trust-Critical  |
| :---- |

| Checkout Flow — Step 2: Payment Details Card form (card number, expiry, CVV with inline validation). Or bank transfer instructions. Or crypto wallet QR \+ address. 30-second quote lock countdown timer for crypto.  Mobile-First  Form Design  Conversion  |
| :---- |

| Checkout Flow — Step 3: Confirmation Payment processing animation. Success state with amount, reference ID, and merchant email. Error state with clear reason and retry option. Redirect countdown.  Success/Error States  Mobile-First  |
| :---- |

| Payment Link Landing Branded page a recipient sees when opening a Useroutr Link. Shows merchant name, logo (if set), amount or custom amount field, description, and expiry timer. Leads into checkout flow.  Consumer-Facing  Minimal  |
| :---- |

**04  ·  VISUAL IDENTITY**

# **Visual Identity System**

Useroutr has an established brand direction. The designer's job is to execute it faithfully and extend it into a coherent, scalable design system — not to reinvent it. Every decision should feel like it could have come from this brief.

## **4.1  Personality & Aesthetic**

| Useroutr is... | Useroutr is NOT... | Reference Feel |
| :---- | :---- | :---- |
| Technically credible Trustworthy & institutional Modern and clean Calm under complexity Precise and deliberate Developer-native | Hype-driven or flashy Overly crypto-bro Cluttered or noisy Playful or casual Generic SaaS blue Purple-gradient AI-core | Stripe (trust, clarity) Linear (developer aesthetic) Wise (global, accessible) Vercel (dark mode done right) Mercury (banking, clean) Resend (dev-native tone) |

## **4.2  Color System**

The full Useroutr color palette. Use semantic roles — do not use colors arbitrarily. Every color choice should be defensible by its role.

| Swatch | Name | Hex | Usage Role |
| :---- | :---- | :---- | :---- |
|    | **Deep Ocean** | \#0A2463 | Primary brand, hero backgrounds, nav, heavy headings |
|    | **Useroutr Blue** | \#007BFF | Primary CTA buttons, links, active states, key accents |
|    | **Stellar Teal** | \#00C0B0 | Secondary accent, badges, Stellar references, success tones |
|    | **Cyber Green** | \#28A745 | Success states, paid badges, positive delta indicators |
|    | **Sunset Orange** | \#FD7E14 | Warning states, pending badges, attention alerts |
|    | **Electric Purple** | \#6F42C1 | Premium features, enterprise tier highlights |
|    | **Danger Red** | \#DC2626 | Error states, failed transactions, destructive actions |
|    | **Dark Grey** | \#343A40 | Body text on light bg, secondary nav items |
|    | **Mid Grey** | \#6C757D | Placeholder text, metadata, timestamps |
|    | **Border Grey** | \#DEE2E6 | Table borders, dividers, card outlines |
|    | **Surface Light** | \#F8F9FA | Page backgrounds, table stripes, sidebar bg (light mode) |
|    | **Surface Dark** | \#0B1628 | Page background (dark mode), hero sections |
|    | **White** | \#FFFFFF | Cards, modals, input backgrounds (light mode) |

## **4.3  Typography**

Two typefaces only. No exceptions without documented approval.

| Role | Specification |
| :---- | :---- |
| Display / Headings | Inter — Bold (700) and SemiBold (600) |
| Body / Paragraphs | Open Sans — Regular (400) and Medium (500) |
| Code / Mono | IBM Plex Mono — Regular (400) |
| H1 — Page Title | Inter Bold · 36px · Letter-spacing: \-0.5px |
| H2 — Section Title | Inter SemiBold · 24px · Letter-spacing: \-0.3px |
| H3 — Sub-section | Inter SemiBold · 18px |
| Body Large | Open Sans Regular · 16px · Line-height: 1.65 |
| Body Default | Open Sans Regular · 14px · Line-height: 1.6 |
| Caption / Meta | Open Sans Regular · 12px · Color: Mid Grey |
| Code Inline | IBM Plex Mono · 13px · Background: Surface Light |
| Code Block | IBM Plex Mono · 13px · Dark surface bg |

## **4.4  Logo**

The Useroutr logo is a combination mark: a geometric dual-V diamond icon paired with the lowercase wordmark 'useroutr'. The double-V in the name is intentional and should always appear as written — never 'useroutr' with a single V.

| Logo Usage Rules |
| :---- |
| The icon (diamond mark) can be used alone as app icon, favicon, or avatar — never the wordmark alone without the icon in product UI. |
| Minimum size: 24px height for icon, 80px width for full lockup. |
| Clear space: minimum 1x the icon height on all sides. |
| On dark backgrounds: use full color version (blue icon, white wordmark). |
| On light backgrounds: use full color version (blue icon, ocean wordmark). |
| Never recolor, stretch, add effects, or use on busy photographic backgrounds. |
| The 'vv' in 'useroutr' should always be set slightly tighter than surrounding letterforms. |

## **4.5  Iconography**

Use Phosphor Icons (<https://phosphoricons.com>) as the primary icon library — Regular weight by default, Bold for emphasis. Do not mix icon libraries. Icons should always have a label unless space is critically constrained, in which case a tooltip is mandatory.

| Context | Icon Style |
| :---- | :---- |
| Navigation sidebar | Phosphor Regular · 20px |
| Action buttons | Phosphor Regular · 16px · with label |
| Status indicators | Phosphor Fill · 14px · color-matched to status |
| Empty states | Phosphor Thin or Light · 48px · muted color |
| Data table row actions | Phosphor Regular · 14px |
| Crypto chain logos | Official chain SVGs — do not substitute |

## **4.6  Spacing & Grid**

Useroutr uses an 8px base spacing system. All padding, margins, gaps, and layout dimensions must be multiples of 8 (8, 16, 24, 32, 48, 64, 80, 96...). Never use arbitrary values like 10px, 13px, or 22px.

| Grid Specs |
| :---- |
| Dashboard: 12-column grid · 24px gutters · 48px left sidebar \+ 260px nav panel |
| Checkout: centered single column · max 460px · 32px horizontal padding |
| Docs site: 260px sidebar \+ fluid content area · max 840px content width |
| Marketing site: 12-column · 1200px max-width · 32px horizontal padding on mobile |
| Card components: 24px internal padding · 16px between elements |
| Modal dialogs: max 480px · 40px padding · 24px between form fields |

**05  ·  COMPONENT LIBRARY**

# **Design System & Components**

Useroutr requires a fully built Figma component library before screen design begins. Components must be built with auto-layout, variants, and Figma variables (for light/dark mode). Do not design screens without the library — it will cause rework.

## **Priority 1 — Build First**

### **Buttons**

Primary (Blue fill), Secondary (Ghost/outlined), Destructive (Red), Text link. States: Default, Hover, Active, Disabled, Loading. Sizes: SM (32px), MD (40px), LG (48px).

### **Input Fields**

Text, Email, Password (with toggle), Number, Textarea, Select/Dropdown. States: Default, Focus (blue ring), Error (red border \+ message), Disabled, Success. All with label \+ helper text.

### **Status Badges**

Pill badges for: Completed (Green), Pending (Orange), Processing (Blue), Failed (Red), Cancelled (Grey), Overdue (Red outline), Draft (Grey outline). Always icon \+ label.

### **Data Table**

Sortable headers, row hover state, checkbox selection, expandable rows, pagination controls, empty state, loading skeleton. With and without filters.

### **Cards**

Metric card (number \+ delta \+ trend line), Transaction card, Alert/notification card. Each with loading skeleton variant.

### **Navigation**

Left sidebar nav with icon \+ label, active state highlight, collapsed/icon-only mode, section groupings. Top bar with breadcrumb, search, notification bell, user avatar menu.

### **Modal / Drawer**

Center modal (max 480px) and right-side drawer (max 520px). With header, scrollable body, sticky footer actions. Overlay backdrop.

## **Priority 2 — Build Alongside Screens**

### **Form Elements**

Date picker, Multi-select, File upload drop zone, Currency input (with flag \+ code selector), Amount input with live conversion display.

### **Empty States**

Illustrated empty state for each major section (Transactions, Payouts, Invoices, etc.). Icon \+ headline \+ subtext \+ primary CTA.

### **Toast Notifications**

Success, Error, Warning, Info. Max 320px width. Auto-dismiss (4s) with manual close. Stack up to 3\.

### **Code Block**

Syntax-highlighted code block with language label, line numbers, and copy-to-clipboard button. Dark bg only. Used in docs and onboarding.

### **Onboarding Steps**

Step indicator component (1 of 4 style). Used in API setup, team invite, and checkout customization flows.

### **Charts**

Line chart (revenue over time), Bar chart (volume by method), Donut chart (currency split), Sparkline (metric cards). Use Recharts as the design reference.

**06  ·  UX PRINCIPLES**

# **UX Principles & Interaction Guidelines**

These principles govern every design decision on Useroutr. They are not suggestions — they are constraints. When a design decision violates one of these, revisit and revise.

| Principle | What it means in practice |
| :---- | :---- |
| **Hide the complexity** | The user should never feel the weight of what Useroutr is doing under the hood. Crypto bridging, path payments, Soroban contracts — none of it surfaces in the UI unless the user explicitly digs for it. Show outcomes, not mechanics. |
| **Status is sacred** | Every transaction, payout, and invoice has a state. That state must always be visible, unambiguous, and consistently styled. Never let a user wonder 'what is happening right now?' |
| **Errors are conversations** | Error messages must explain what went wrong, why it happened, and what the user can do next. 'Something went wrong' is never acceptable. Every error state is a designed screen. |
| **Confirmation before destruction** | Any irreversible action (cancel payout, revoke API key, delete webhook) requires a confirmation modal with a plain-language description of the consequence. |
| **Loading is a designed state** | Every data-loading moment gets a skeleton loader — not a spinner, not a blank screen. Skeleton dimensions must match real content dimensions. |
| **Mobile is not an afterthought** | The checkout flow and payment links are consumer-facing and must be designed mobile-first, then adapted for desktop. The merchant dashboard is desktop-first, but must be fully usable on a 375px screen. |
| **Developers read before they click** | Documentation and onboarding flows for developers should prioritize information density and scanability over decoration. Code examples appear early and often. |
| **One primary action per screen** | Every page has one clear primary CTA. Secondary actions are visually subordinate. Tertiary actions live in menus or drawers. The eye should never be confused about where to go first. |
| **Numbers need context** | Never show a raw number without a unit, currency code, delta, or comparison point. '$10,000' is less useful than '$10,000 USD ↑ 12% vs last month'. |
| **Trust is designed in** | Payment products live and die by trust. Every screen should include at least one trust signal: security badge, Stellar settlement indicator, 'Powered by Useroutr' mark (on hosted surfaces), or visual confirmation of encryption. |

## **Motion & Animation**

Useroutr uses motion purposefully — never decoratively. Every animation has a functional reason.

| Element | Behavior |
| :---- | :---- |
| Page transitions | Fade only · 150ms · ease-out |
| Modal open | Fade \+ scale from 96% → 100% · 200ms |
| Drawer open | Slide in from right · 250ms · ease-out |
| Toast notification | Slide up from bottom · 200ms · auto-dismiss 4s |
| Skeleton loader | Shimmer left to right · 1.5s · infinite loop |
| Button hover | Background tint shift · 120ms |
| Status badge | No animation — status is information, not decoration |
| Chart render | Animate in on first mount only · 400ms · ease-out |
| Number counters | Count up animation on dashboard load · 600ms |
| Quote countdown timer | Live countdown with color shift at 10s remaining |

**07  ·  CRITICAL USER FLOWS**

# **Critical User Flows**

The following flows must be fully mapped in Figma as interactive prototypes before handoff. Each flow includes entry point, steps, edge cases, and exit states.

## **Flow 1 — Developer Onboarding**

| Entry: Developer lands on useroutr.io, clicks 'Start Building' |
| :---- |
| 1\. Marketing site → Sign up form (name, email, company, password) |
| 2\. Email verification → Redirect to dashboard |
| 3\. Onboarding checklist: Create first API key → Copy key → Make test payment → Set webhook URL |
| 4\. Sandbox mode indicator always visible until first live transaction |
| 5\. Dashboard home with empty states and 'Get Started' shortcuts |
| *Edge cases to design: Invalid email, weak password, duplicate account, verification link expired.* |

## **Flow 2 — Create & Share a Payment Link**

| Entry: Merchant clicks 'New Payment Link' from sidebar or dashboard shortcut |
| :---- |
| 1\. Slide-out drawer or modal: Amount (fixed or open), Currency, Description, Expiry date toggle, Single-use toggle |
| 2\. Preview of how the link will appear to the payer |
| 3\. Confirm → Link generated → Copy, Share, Download QR |
| 4\. Link appears in Payment Links list with 'Active' badge |
| 5\. Real-time update when link is viewed or paid (webhook fires → toast notification) |
| *Edge cases: Expired link, single-use already redeemed, zero-amount link.* |

## **Flow 3 — Consumer Checkout (Crypto Path)**

| Entry: Consumer clicks a Useroutr payment link or is redirected to hosted checkout |
| :---- |
| 1\. Order summary (merchant name, logo, amount, description) |
| 2\. Select payment method: Card / Bank / Crypto |
| 3\. Crypto selected → Choose chain → Choose token → Show wallet address \+ QR code |
| 4\. Conversion rate displayed: '0.0032 ETH \= $10.00 USD' with 30s quote lock timer |
| 5\. Awaiting payment screen with animated confirmation indicator |
| 6\. Payment detected → Processing animation (Stellar path payment in progress) |
| 7\. Confirmed → Success screen with reference ID, amount, merchant email |
| *Edge cases: Quote expired (refresh prompt), wrong amount sent, payment timeout, network congestion warning.* |

## **Flow 4 — Bulk Payout**

| Entry: Merchant clicks 'New Payout' → selects 'Bulk' |
| :---- |
| 1\. Upload CSV or add recipients manually (name, destination type, account details, amount, currency) |
| 2\. Validation table: rows with errors highlighted, fix-inline or re-upload |
| 3\. Summary: total amount, number of recipients, estimated fee, settlement time |
| 4\. 2FA confirmation step (if enabled) |
| 5\. Bulk job created → Progress tracker (X of Y completed) |
| 6\. Per-recipient status: Pending → Processing → Completed / Failed |
| 7\. Failed recipients: reason shown, option to retry individually |
| *Edge cases: Insufficient balance, invalid bank account, unsupported destination country, row validation errors in CSV.* |

**08  ·  LIGHT & DARK MODE**

# **Light & Dark Mode**

Both modes are required across all dashboard surfaces and the docs site. The marketing site is dark-first. The checkout flow is light-first (higher trust signal for consumers). Use Figma Variables for color tokens — not hardcoded hex values in components.

| Surface | Light Mode |
| :---- | :---- |
| Page background | \#F8F9FA |
| Card / Panel background | \#FFFFFF |
| Sidebar background | \#F1F5F9 |
| Primary text | \#212529 |
| Secondary text | \#6C757D |
| Border / Divider | \#DEE2E6 |
| Input background | \#FFFFFF |
| Input border | \#DEE2E6 |
| Code block bg | \#F1F5F9 |

*Note: Primary brand colors (Useroutr Blue, Stellar Teal, status colors) remain consistent across both modes. Only surface and text tokens switch.*

**09  ·  DELIVERABLES & TIMELINE**

# **Deliverables**

The following deliverables are expected at handoff. All files should be organized in a shared Figma workspace. Name every page, frame, and component clearly — engineers will read these directly.

| \# | Deliverable | What's Included | Format |
| ----- | :---- | :---- | :---- |
| **01** | **Component Library** | All components with variants, states, and dark/light mode. Auto-layout throughout. Named with BEM-style convention. | Figma File |
| **02** | **Marketing Site** | Homepage, Docs index page, 404 page. Desktop \+ mobile (375px, 768px, 1440px breakpoints). | Figma Frames |
| **03** | **Merchant Dashboard** | All 8 sections fully designed. Light \+ dark mode. Desktop (1280px) \+ mobile (375px). Real data in frames — no Lorem Ipsum. | Figma Frames |
| **04** | **Hosted Checkout** | 3-step checkout flow × 3 payment methods \= 9 core screens. Card, bank, crypto paths. Mobile-first (375px) \+ desktop (1440px). | Figma Frames |
| **05** | **Payment Link Page** | Consumer landing for payment links. Branded \+ default version. Mobile \+ desktop. | Figma Frames |
| **06** | **Prototypes** | Clickable prototype for: Developer Onboarding, Create Payment Link, Consumer Checkout (crypto path), Bulk Payout flow. | Figma Prototype |
| **07** | **Design Tokens** | All color, typography, spacing, and radius tokens as Figma Variables. Organized by category. | Figma Variables |
| **08** | **Annotations** | Dev-mode annotations on spacing, interactions, component names, and API data fields for every major screen. | Figma Dev Mode |
| **09** | **Asset Export** | All icons, illustrations, and brand assets exported in correct formats (SVG for icons, WebP for images, PNG@2x fallbacks). | Figma Export |
| **10** | **Style Guide PDF** | One-page visual reference of the full design system: colors, type scale, spacing, components, do/don't examples. | PDF Export |

## **Suggested Phase Timeline**

| Phase | Focus & Output |
| :---- | :---- |
| Week 1–2 | Discovery · Review brief · Competitive analysis · Moodboard · Design system foundation (tokens \+ base components) |
| Week 3–4 | Core Components · Complete component library · Typography specimens · Color system in Figma Variables |
| Week 5–6 | Dashboard · Overview, Transactions, Settings screens · Light \+ dark mode · Desktop \+ mobile |
| Week 7–8 | Products · Payment Links, Invoicing, Payouts, On/Off Ramp, Analytics screens |
| Week 9 | Checkout \+ Links · All 3 checkout paths · Payment link consumer page · Mobile-first |
| Week 10 | Marketing Site · Homepage · Docs index · 404 · Responsive breakpoints |
| Week 11 | Prototypes · 4 interactive flows · Edge case screens · Empty states |
| Week 12 | Handoff · Annotations · Dev Mode · Token export · Style guide PDF |

**10  ·  NON-NEGOTIABLES**

# **Non-Negotiables & Contact**

The following rules are absolute. They are not up for creative interpretation. Deviations must be escalated and approved in writing before work continues.

| Design Rules — No Exceptions |
| :---- |
| Never use Inter for body copy — that's Open Sans. Never use Open Sans for headings — that's Inter. |
| Never use arbitrary spacing values. All spacing is a multiple of 8px. |
| Never use purple gradients, neon colors, or glowing crypto aesthetics. |
| Never design a screen without a loading state and an empty state. |
| Never use placeholder text ('Lorem ipsum') in final frames. Use realistic Useroutr data. |
| Never design error states that say only 'Error' or 'Something went wrong'. |
| Never use a spinner as a loading state for data tables or cards — use skeletons. |
| All Figma components must have proper variants and auto-layout. No static components. |
| Every color in Figma must reference a Variable — no raw hex values in component fills. |
| Mobile screens must be designed at 375px width minimum, not just shrunk from desktop. |

## **Key References for Research**

| Reference | Why It's Relevant |
| :---- | :---- |
| stripe.com / dashboard.stripe.com | Gold standard for payment dashboard UX and trust design |
| mercury.com | Clean banking product for business owners — similar audience |
| linear.app | Developer-native dashboard aesthetic and component quality |
| wise.com | Multi-currency, global payments — very similar mental model |
| vercel.com/dashboard | Dark mode dashboard done right for technical users |
| phosphoricons.com | Our icon library — study the full set |
| docs.useroutr.io (this brief) | The product this brief describes |
| Chainrails.io | Closest competitor — understand what to differentiate from |

| Questions? Contact the Useroutr team. useroutr.io  ·  docs.useroutr.io  ·  A product of thirtn.com Version 1.0  ·  February 2026  ·  Confidential |
| :---: |
