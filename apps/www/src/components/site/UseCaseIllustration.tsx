"use client";

import { motion } from "motion/react";

type Variant = "marketplaces" | "fintech" | "ecommerce" | "payouts";

interface Props {
  variant: Variant;
  className?: string;
}

/**
 * Per-vertical SVG illustrations. Editorial style — single-color line work
 * over a soft tinted block, no gradients, no AI illustration look. Each one
 * tells a tiny story about the vertical (network of sellers, embedded wallet,
 * shop, globe).
 */
export function UseCaseIllustration({ variant, className }: Props) {
  return (
    <svg
      viewBox="0 0 320 200"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`${variant} illustration`}
    >
      <rect width="320" height="200" fill="#F0F1F0" />
      {variant === "marketplaces" && <Marketplaces />}
      {variant === "fintech" && <Fintech />}
      {variant === "ecommerce" && <Ecommerce />}
      {variant === "payouts" && <Payouts />}
    </svg>
  );
}

function Marketplaces() {
  // Network of small seller nodes connected to a central hub
  const sellers = [
    { x: 60, y: 50 },
    { x: 110, y: 38 },
    { x: 250, y: 58 },
    { x: 270, y: 110 },
    { x: 70, y: 130 },
    { x: 130, y: 160 },
    { x: 220, y: 160 },
  ];
  return (
    <g stroke="#0e0e0c" strokeWidth="1.4" fill="none">
      {sellers.map((s, i) => (
        <motion.line
          key={`l-${i}`}
          x1="160"
          y1="100"
          x2={s.x}
          y2={s.y}
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 0.4 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1 + i * 0.05 }}
        />
      ))}
      <circle cx="160" cy="100" r="22" fill="#5B53D8" stroke="none" />
      <text
        x="160"
        y="105"
        textAnchor="middle"
        fontSize="13"
        fontFamily="var(--font-mono)"
        fill="#fff"
      >
        you
      </text>
      {sellers.map((s, i) => (
        <motion.circle
          key={`s-${i}`}
          cx={s.x}
          cy={s.y}
          r="9"
          fill="#fff"
          stroke="#0e0e0c"
          initial={{ scale: 0, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.4 + i * 0.05 }}
        />
      ))}
    </g>
  );
}

function Fintech() {
  // Phone-shape with embedded wallet UI
  return (
    <g>
      <motion.rect
        initial={{ y: 30, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        x="120"
        y="20"
        width="80"
        height="160"
        rx="12"
        fill="#fff"
        stroke="#0e0e0c"
        strokeWidth="1.4"
      />
      <line x1="155" y1="32" x2="165" y2="32" stroke="#0e0e0c" strokeWidth="1.4" />
      <rect x="132" y="50" width="56" height="22" rx="4" fill="#0e0e0c" />
      <text
        x="160"
        y="65"
        textAnchor="middle"
        fontSize="9"
        fontFamily="var(--font-mono)"
        fill="#F9FAF9"
      >
        $284,500
      </text>
      <rect x="132" y="80" width="56" height="14" rx="3" fill="#F0F1F0" stroke="#0e0e0c" strokeWidth="1" />
      <rect x="132" y="100" width="56" height="14" rx="3" fill="#F0F1F0" stroke="#0e0e0c" strokeWidth="1" />
      <rect x="132" y="120" width="56" height="14" rx="3" fill="#5B53D8" />
      <text
        x="160"
        y="130"
        textAnchor="middle"
        fontSize="8"
        fontFamily="var(--font-mono)"
        fill="#fff"
      >
        Send →
      </text>
      {/* Decorative lines suggesting transfer */}
      <motion.path
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1, delay: 0.5 }}
        d="M120 60 Q 80 60, 60 100 Q 40 140, 90 160"
        stroke="#0e0e0c"
        strokeWidth="1.2"
        strokeDasharray="3 3"
        fill="none"
      />
      <motion.path
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1, delay: 0.7 }}
        d="M200 60 Q 240 60, 260 100 Q 280 140, 230 160"
        stroke="#0e0e0c"
        strokeWidth="1.2"
        strokeDasharray="3 3"
        fill="none"
      />
    </g>
  );
}

function Ecommerce() {
  // Stylized storefront with awning
  return (
    <g>
      <motion.path
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2 }}
        d="M40 100 L40 60 L160 30 L280 60 L280 100"
        fill="none"
        stroke="#0e0e0c"
        strokeWidth="1.4"
      />
      {/* Stripes on awning */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <motion.path
          key={i}
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 + i * 0.06 }}
          d={`M${60 + i * 40} 100 L${85 + i * 40} 50`}
          stroke={i % 2 === 0 ? "#5B53D8" : "#0e0e0c"}
          strokeWidth="1.2"
          fill="none"
        />
      ))}
      {/* Storefront body */}
      <rect x="60" y="100" width="200" height="80" fill="#fff" stroke="#0e0e0c" strokeWidth="1.4" />
      <rect x="80" y="120" width="60" height="50" fill="#F0F1F0" stroke="#0e0e0c" strokeWidth="1.2" />
      <rect x="180" y="120" width="60" height="50" fill="#F0F1F0" stroke="#0e0e0c" strokeWidth="1.2" />
      <rect x="148" y="130" width="24" height="40" fill="#0e0e0c" />
      <circle cx="166" cy="150" r="1.5" fill="#5B53D8" />
    </g>
  );
}

function Payouts() {
  // Globe with dotted longitude lines + arrow targets
  return (
    <g>
      <motion.circle
        initial={{ scale: 0 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        cx="160"
        cy="100"
        r="65"
        fill="none"
        stroke="#0e0e0c"
        strokeWidth="1.4"
      />
      {/* Lat lines */}
      {[0, 1, 2, 3].map((i) => (
        <ellipse
          key={`lat-${i}`}
          cx="160"
          cy="100"
          rx="65"
          ry={65 - i * 18}
          fill="none"
          stroke="#0e0e0c"
          strokeOpacity="0.25"
          strokeWidth="1"
        />
      ))}
      {/* Long lines */}
      {[0, 1, 2].map((i) => (
        <ellipse
          key={`lng-${i}`}
          cx="160"
          cy="100"
          rx={65 - i * 18}
          ry="65"
          fill="none"
          stroke="#0e0e0c"
          strokeOpacity="0.25"
          strokeWidth="1"
        />
      ))}
      {/* Targets */}
      {[
        { x: 130, y: 80 },
        { x: 200, y: 85 },
        { x: 175, y: 130 },
        { x: 110, y: 130 },
      ].map((t, i) => (
        <motion.g
          key={i}
          initial={{ opacity: 0, scale: 0 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.6 + i * 0.1 }}
        >
          <circle cx={t.x} cy={t.y} r="5" fill="#5B53D8" />
          <circle
            cx={t.x}
            cy={t.y}
            r="9"
            fill="none"
            stroke="#5B53D8"
            strokeOpacity="0.4"
          />
        </motion.g>
      ))}
    </g>
  );
}
