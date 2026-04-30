"use client";

import { motion } from "motion/react";

type Variant = "checkout" | "invoicing" | "payouts" | "ramp";

interface Props {
  variant: Variant;
  className?: string;
}

/**
 * Per-product line illustrations for the homepage Differentiators section.
 * Same visual language as UseCaseIllustration (cream block, line work in
 * deep ink, orange accents) but each one tells a story specific to that
 * product so the four feel as a set, not as duplicates.
 */
export function ProductIllustration({ variant, className }: Props) {
  return (
    <svg
      viewBox="0 0 320 200"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`${variant} illustration`}
    >
      <rect width="320" height="200" fill="#F0F1F0" />
      {variant === "checkout" && <Checkout />}
      {variant === "invoicing" && <Invoicing />}
      {variant === "payouts" && <Payouts />}
      {variant === "ramp" && <Ramp />}
    </svg>
  );
}

function Checkout() {
  // Browser frame with a hosted checkout UI inside
  return (
    <g>
      {/* Browser frame */}
      <motion.rect
        initial={{ y: 12, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        x="40"
        y="30"
        width="240"
        height="140"
        rx="8"
        fill="#fff"
        stroke="#0e0e0c"
        strokeWidth="1.4"
      />
      {/* Browser top bar */}
      <line x1="40" y1="50" x2="280" y2="50" stroke="#0e0e0c" strokeWidth="1" />
      <circle cx="50" cy="40" r="2" fill="#0e0e0c" />
      <circle cx="58" cy="40" r="2" fill="#0e0e0c" />
      <circle cx="66" cy="40" r="2" fill="#0e0e0c" />
      <rect
        x="78"
        y="36"
        width="170"
        height="9"
        rx="4.5"
        fill="#F0F1F0"
        stroke="#0e0e0c"
        strokeWidth="0.8"
      />
      <text
        x="86"
        y="42.5"
        fontSize="6"
        fontFamily="var(--font-mono)"
        fill="#0e0e0c"
      >
        checkout.useroutr.io
      </text>

      {/* Order summary */}
      <text
        x="56"
        y="68"
        fontSize="7"
        fontFamily="var(--font-mono)"
        fill="#65645d"
      >
        ORDER · #pay_xyz789
      </text>
      <text
        x="56"
        y="84"
        fontSize="14"
        fontFamily="var(--font-display)"
        fontWeight="600"
        fill="#0e0e0c"
      >
        $100.00 USD
      </text>

      {/* Method tabs */}
      <motion.g
        initial={{ opacity: 0, y: 4 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <rect
          x="56"
          y="98"
          width="74"
          height="22"
          rx="11"
          fill="#0e0e0c"
        />
        <text
          x="93"
          y="112"
          textAnchor="middle"
          fontSize="8"
          fontFamily="var(--font-mono)"
          fill="#fff"
        >
          Crypto
        </text>
        <rect
          x="136"
          y="98"
          width="74"
          height="22"
          rx="11"
          fill="none"
          stroke="#0e0e0c"
          strokeWidth="1"
        />
        <text
          x="173"
          y="112"
          textAnchor="middle"
          fontSize="8"
          fontFamily="var(--font-mono)"
          fill="#0e0e0c"
        >
          MoneyGram
        </text>
      </motion.g>

      {/* Pay button */}
      <motion.g
        initial={{ opacity: 0, y: 6 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <rect
          x="56"
          y="135"
          width="208"
          height="22"
          rx="11"
          fill="#5B53D8"
        />
        <text
          x="160"
          y="149"
          textAnchor="middle"
          fontSize="9"
          fontFamily="var(--font-mono)"
          fill="#fff"
        >
          Pay $100.00 →
        </text>
      </motion.g>
    </g>
  );
}

function Invoicing() {
  // Three stacked invoice papers showing the lifecycle — Draft, Sent, Paid
  const stack = [
    { x: 100, y: 50, rotation: -4, label: "DRAFT", paid: false },
    { x: 90, y: 40, rotation: -2, label: "SENT", paid: false },
    { x: 80, y: 30, rotation: 0, label: "PAID", paid: true },
  ];
  return (
    <g>
      {stack.map((s, i) => (
        <motion.g
          key={i}
          initial={{ opacity: 0, x: -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 + i * 0.12 }}
          transform={`rotate(${s.rotation} ${s.x + 70} ${s.y + 70})`}
        >
          <rect
            x={s.x}
            y={s.y}
            width="140"
            height="140"
            fill="#fff"
            stroke="#0e0e0c"
            strokeWidth="1.4"
          />
          {/* Invoice header */}
          <text
            x={s.x + 12}
            y={s.y + 22}
            fontSize="14"
            fontFamily="var(--font-display)"
            fontWeight="600"
            fill="#0e0e0c"
          >
            Invoice
          </text>
          <text
            x={s.x + 12}
            y={s.y + 34}
            fontSize="6"
            fontFamily="var(--font-mono)"
            fill="#65645d"
          >
            INV-0042
          </text>
          {/* Lines */}
          <line
            x1={s.x + 12}
            y1={s.y + 50}
            x2={s.x + 128}
            y2={s.y + 50}
            stroke="#0e0e0c"
            strokeWidth="0.6"
            strokeOpacity="0.3"
          />
          <line
            x1={s.x + 12}
            y1={s.y + 64}
            x2={s.x + 100}
            y2={s.y + 64}
            stroke="#0e0e0c"
            strokeWidth="0.6"
            strokeOpacity="0.3"
          />
          <line
            x1={s.x + 12}
            y1={s.y + 78}
            x2={s.x + 110}
            y2={s.y + 78}
            stroke="#0e0e0c"
            strokeWidth="0.6"
            strokeOpacity="0.3"
          />
          <line
            x1={s.x + 12}
            y1={s.y + 92}
            x2={s.x + 90}
            y2={s.y + 92}
            stroke="#0e0e0c"
            strokeWidth="0.6"
            strokeOpacity="0.3"
          />
          {/* Total */}
          <line
            x1={s.x + 12}
            y1={s.y + 104}
            x2={s.x + 128}
            y2={s.y + 104}
            stroke="#0e0e0c"
            strokeWidth="1"
          />
          <text
            x={s.x + 12}
            y={s.y + 118}
            fontSize="7"
            fontFamily="var(--font-mono)"
            fill="#65645d"
          >
            TOTAL
          </text>
          <text
            x={s.x + 128}
            y={s.y + 118}
            textAnchor="end"
            fontSize="11"
            fontFamily="var(--font-display)"
            fontWeight="600"
            fill="#0e0e0c"
          >
            $1,240
          </text>
          {/* Status badge */}
          <rect
            x={s.x + 12}
            y={s.y + 124}
            width={s.label === "PAID" ? 32 : s.label === "SENT" ? 32 : 36}
            height="9"
            rx="4.5"
            fill={s.paid ? "#5B53D8" : "none"}
            stroke="#0e0e0c"
            strokeWidth="0.8"
          />
          <text
            x={s.x + 28}
            y={s.y + 130.5}
            textAnchor="middle"
            fontSize="6"
            fontFamily="var(--font-mono)"
            fill={s.paid ? "#fff" : "#0e0e0c"}
          >
            {s.label}
          </text>
        </motion.g>
      ))}
    </g>
  );
}

function Payouts() {
  // One source on the left fanning out to multiple recipients on the right
  const recipients = [
    { y: 50, label: "USD · NY", flag: "🇺🇸", amt: "$15K" },
    { y: 90, label: "EUR · DE", flag: "🇩🇪", amt: "€12K" },
    { y: 130, label: "NGN · LA", flag: "🇳🇬", amt: "₦8M" },
    { y: 170, label: "USDC · BS", flag: "◈", amt: "$5K" },
  ];
  return (
    <g>
      {/* Source node */}
      <motion.g
        initial={{ opacity: 0, scale: 0.7 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <rect x="20" y="80" width="80" height="40" rx="6" fill="#0e0e0c" />
        <text
          x="60"
          y="98"
          textAnchor="middle"
          fontSize="9"
          fontFamily="var(--font-display)"
          fontWeight="600"
          fill="#fff"
        >
          Bulk payout
        </text>
        <text
          x="60"
          y="112"
          textAnchor="middle"
          fontSize="7"
          fontFamily="var(--font-mono)"
          fill="#9a988e"
        >
          $40,200.00
        </text>
      </motion.g>

      {/* Recipients */}
      {recipients.map((r, i) => (
        <motion.g
          key={i}
          initial={{ opacity: 0, x: 14 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 + i * 0.08 }}
        >
          {/* Connector line */}
          <motion.path
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 + i * 0.06 }}
            d={`M 100 ${100} Q ${150} ${100}, ${180} ${r.y + 14}`}
            stroke="#0e0e0c"
            strokeWidth="1"
            strokeDasharray="2 2"
            fill="none"
          />
          {/* Recipient pill */}
          <rect
            x="180"
            y={r.y}
            width="120"
            height="28"
            rx="14"
            fill="#fff"
            stroke="#0e0e0c"
            strokeWidth="1"
          />
          <text
            x="194"
            y={r.y + 18}
            fontSize="8"
            fontFamily="var(--font-mono)"
            fill="#0e0e0c"
          >
            {r.flag} {r.label}
          </text>
          <text
            x="290"
            y={r.y + 18}
            textAnchor="end"
            fontSize="8"
            fontFamily="var(--font-mono)"
            fill="#5B53D8"
          >
            {r.amt}
          </text>
        </motion.g>
      ))}
    </g>
  );
}

function Ramp() {
  // Two-column conversion: $ → USDC, with curved swap arrow
  return (
    <g>
      {/* Left column — fiat $ */}
      <motion.g
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <rect
          x="40"
          y="50"
          width="100"
          height="100"
          rx="8"
          fill="#fff"
          stroke="#0e0e0c"
          strokeWidth="1.4"
        />
        <text
          x="56"
          y="70"
          fontSize="7"
          fontFamily="var(--font-mono)"
          fill="#65645d"
        >
          FIAT IN
        </text>
        <text
          x="56"
          y="98"
          fontSize="22"
          fontFamily="var(--font-display)"
          fontWeight="600"
          fill="#0e0e0c"
        >
          $250
        </text>
        <text
          x="56"
          y="120"
          fontSize="8"
          fontFamily="var(--font-mono)"
          fill="#65645d"
        >
          via MoneyGram
        </text>
        <text
          x="56"
          y="135"
          fontSize="7"
          fontFamily="var(--font-mono)"
          fill="#65645d"
        >
          Lagos · NG
        </text>
      </motion.g>

      {/* Curved swap arrow */}
      <motion.g
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <motion.path
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.5 }}
          d="M 144 90 Q 160 70, 178 90"
          stroke="#5B53D8"
          strokeWidth="1.6"
          fill="none"
        />
        <path d="M 178 90 L 173 86 L 173 94 Z" fill="#5B53D8" />
        <motion.path
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.7 }}
          d="M 178 110 Q 162 130, 144 110"
          stroke="#0e0e0c"
          strokeWidth="1.4"
          strokeDasharray="2 2"
          fill="none"
        />
        <path d="M 144 110 L 149 106 L 149 114 Z" fill="#0e0e0c" />
      </motion.g>

      {/* Right column — USDC */}
      <motion.g
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <rect
          x="180"
          y="50"
          width="100"
          height="100"
          rx="8"
          fill="#0e0e0c"
        />
        <text
          x="196"
          y="70"
          fontSize="7"
          fontFamily="var(--font-mono)"
          fill="#9a988e"
        >
          STABLECOIN OUT
        </text>
        <text
          x="196"
          y="98"
          fontSize="22"
          fontFamily="var(--font-display)"
          fontWeight="600"
          fill="#fff"
        >
          250
        </text>
        <text
          x="196"
          y="120"
          fontSize="8"
          fontFamily="var(--font-mono)"
          fill="#9a988e"
        >
          USDC · Stellar
        </text>
        <text
          x="196"
          y="135"
          fontSize="7"
          fontFamily="var(--font-mono)"
          fill="#9a988e"
        >
          5s settlement
        </text>
      </motion.g>
    </g>
  );
}
