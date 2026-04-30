"use client";

import { motion } from "motion/react";

interface Props {
  className?: string;
}

/**
 * A small editorial postcard illustration — supports the "pricing fits on a
 * postcard" line in the Pricing section. Drawn at a slight rotation, with a
 * stamp, postmark rings, and pricing scribbled in mono type. Decorative; not
 * a precise spec, just a visual reinforcement.
 */
export function PostcardIllustration({ className }: Props) {
  return (
    <svg
      viewBox="0 0 320 220"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Postcard illustration"
    >
      <rect width="320" height="220" fill="transparent" />

      {/* Postcard body — slightly rotated like an editorial photo */}
      <motion.g
        initial={{ opacity: 0, y: 14, rotate: -6 }}
        whileInView={{ opacity: 1, y: 0, rotate: -3 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformOrigin: "160px 110px" }}
      >
        {/* Card */}
        <rect
          x="30"
          y="30"
          width="260"
          height="160"
          fill="#ffffff"
          stroke="#0e0e0c"
          strokeWidth="1.4"
        />

        {/* Vertical divider — postcard back */}
        <line
          x1="160"
          y1="42"
          x2="160"
          y2="178"
          stroke="#0e0e0c"
          strokeWidth="0.8"
          strokeDasharray="2 3"
        />

        {/* Left side — handwritten pricing */}
        <text
          x="44"
          y="58"
          fontSize="9"
          fontFamily="var(--font-mono)"
          fill="#65645d"
        >
          PRICING — POSTCARD ED.
        </text>

        {/* Three rate lines — sketchy editorial */}
        <motion.g
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <text
            x="44"
            y="86"
            fontSize="11"
            fontFamily="var(--font-display)"
            fontWeight="500"
            fill="#0e0e0c"
          >
            Starter
          </text>
          <text
            x="140"
            y="86"
            textAnchor="end"
            fontSize="13"
            fontFamily="var(--font-display)"
            fontWeight="600"
            fill="#0e0e0c"
          >
            0.5%
          </text>
          <line
            x1="44"
            y1="92"
            x2="140"
            y2="92"
            stroke="#0e0e0c"
            strokeWidth="0.6"
            strokeOpacity="0.3"
          />

          <text
            x="44"
            y="112"
            fontSize="11"
            fontFamily="var(--font-display)"
            fontWeight="500"
            fill="#0e0e0c"
          >
            Growth
          </text>
          <text
            x="140"
            y="112"
            textAnchor="end"
            fontSize="13"
            fontFamily="var(--font-display)"
            fontWeight="600"
            fill="#5B53D8"
          >
            0.35%
          </text>
          <line
            x1="44"
            y1="118"
            x2="140"
            y2="118"
            stroke="#0e0e0c"
            strokeWidth="0.6"
            strokeOpacity="0.3"
          />

          <text
            x="44"
            y="138"
            fontSize="11"
            fontFamily="var(--font-display)"
            fontWeight="500"
            fill="#0e0e0c"
          >
            Enterprise
          </text>
          <text
            x="140"
            y="138"
            textAnchor="end"
            fontSize="11"
            fontFamily="var(--font-display)"
            fontWeight="500"
            fill="#0e0e0c"
          >
            Custom
          </text>
          <line
            x1="44"
            y1="144"
            x2="140"
            y2="144"
            stroke="#0e0e0c"
            strokeWidth="0.6"
            strokeOpacity="0.3"
          />

          <text
            x="44"
            y="166"
            fontSize="7"
            fontFamily="var(--font-mono)"
            fill="#65645d"
          >
            ↘ NETWORK FEES PASS-THROUGH
          </text>
        </motion.g>

        {/* Right side — address area + stamp */}
        {/* Address lines */}
        {[0, 1, 2, 3].map((i) => (
          <line
            key={i}
            x1="180"
            y1={92 + i * 14}
            x2={264 - i * 8}
            y2={92 + i * 14}
            stroke="#0e0e0c"
            strokeWidth="0.6"
            strokeOpacity="0.3"
          />
        ))}

        {/* Stamp */}
        <motion.g
          initial={{ rotate: -18, opacity: 0 }}
          whileInView={{ rotate: 4, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: "246px 60px" }}
        >
          <rect
            x="226"
            y="42"
            width="40"
            height="40"
            fill="#5B53D8"
            stroke="#0e0e0c"
            strokeWidth="1"
          />
          {/* Perforated edge — small notches */}
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <g key={i}>
              <circle
                cx={226 + i * 6.6}
                cy="42"
                r="1"
                fill="#F9FAF9"
              />
              <circle
                cx={226 + i * 6.6}
                cy="82"
                r="1"
                fill="#F9FAF9"
              />
              <circle
                cx="226"
                cy={42 + i * 6.6}
                r="1"
                fill="#F9FAF9"
              />
              <circle
                cx="266"
                cy={42 + i * 6.6}
                r="1"
                fill="#F9FAF9"
              />
            </g>
          ))}
          {/* Stamp content */}
          <text
            x="246"
            y="60"
            textAnchor="middle"
            fontSize="11"
            fontFamily="var(--font-display)"
            fontWeight="700"
            fill="#fff"
          >
            $
          </text>
          <text
            x="246"
            y="73"
            textAnchor="middle"
            fontSize="6"
            fontFamily="var(--font-mono)"
            fill="#fff"
          >
            USEROUTR
          </text>
        </motion.g>

        {/* Postmark rings */}
        <motion.g
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.85 }}
          style={{ transformOrigin: "200px 90px" }}
        >
          <circle
            cx="200"
            cy="90"
            r="22"
            fill="none"
            stroke="#0e0e0c"
            strokeWidth="0.8"
            strokeOpacity="0.5"
          />
          <circle
            cx="200"
            cy="90"
            r="16"
            fill="none"
            stroke="#0e0e0c"
            strokeWidth="0.8"
            strokeOpacity="0.5"
          />
          <text
            x="200"
            y="86"
            textAnchor="middle"
            fontSize="5.5"
            fontFamily="var(--font-mono)"
            fill="#0e0e0c"
            fillOpacity="0.6"
          >
            APR · 2026
          </text>
          <text
            x="200"
            y="94"
            textAnchor="middle"
            fontSize="5.5"
            fontFamily="var(--font-mono)"
            fill="#0e0e0c"
            fillOpacity="0.6"
          >
            STELLAR
          </text>
        </motion.g>
      </motion.g>
    </svg>
  );
}
