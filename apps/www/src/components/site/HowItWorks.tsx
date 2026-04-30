"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";

const rows = [
  {
    n: "01",
    title: "Atomic settlement",
    body: "Pure stablecoin payments when you want them, fiat rails when you need them.",
  },
  {
    n: "02",
    title: "You hold your money",
    body: "Useroutr never takes custody of your funds.",
  },
  {
    n: "03",
    title: "Programmable treasury",
    body: "Not a bank account with an API, but a programmable object on a blockchain.",
  },
];

export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  // Diptych floats with the scroll
  const yA = useTransform(scrollYProgress, [0, 1], ["8%", "-8%"]);
  const yB = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);

  return (
    <section
      id="product"
      className="relative border-t border-rule pt-24 pb-32 md:pt-32 md:pb-40"
    >
      <div ref={ref} className="container-x grid grid-cols-1 gap-14 md:grid-cols-2 md:gap-20">
        {/* Left — copy + parallax diptych */}
        <div>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
            className="max-w-[420px] text-[18px] leading-snug text-ink-2 md:text-[20px]"
          >
            Most payment platforms are frontends to the banking system. A
            software layer on top of a bank that holds your money, moves it
            during business hours, and settles in days.
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="mt-5 text-[18px] text-ink md:text-[22px]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
          >
            Useroutr is built <span className="editorial-italic">different.</span>
          </motion.p>

          <div className="mt-10 grid grid-cols-2 gap-3">
            <motion.div
              style={{ y: yA }}
              className="aspect-[3/4] overflow-hidden rounded-md"
            >
              <motion.img
                src="https://images.unsplash.com/photo-1605792657660-596af9009e82?w=1200&q=80&auto=format&fit=crop"
                alt="Aged silver coin texture"
                className="h-full w-full object-cover"
                loading="lazy"
                initial={{ scale: 1.18, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              />
            </motion.div>
            <motion.div
              style={{ y: yB }}
              className="aspect-[3/4] overflow-hidden rounded-md"
            >
              <motion.img
                src="https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=1200&q=80&auto=format&fit=crop"
                alt="Snow mountain peak"
                className="h-full w-full object-cover"
                loading="lazy"
                initial={{ scale: 1.18, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{
                  duration: 1.2,
                  delay: 0.1,
                  ease: [0.22, 1, 0.36, 1],
                }}
              />
            </motion.div>
          </div>
        </div>

        {/* Right — large editorial headline + numbered hairline list */}
        <div>
          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8 }}
            className="text-[44px] leading-[1.02] tracking-[-0.04em] text-ink md:text-[80px]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
          >
            <span aria-hidden className="text-ink-3">→</span> A different
            <br />
            <span className="editorial-italic">financial</span> architecture.
          </motion.h2>

          <div className="mt-12 border-t border-rule">
            {rows.map((r, i) => (
              <motion.div
                key={r.n}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: i * 0.08 }}
                className="row-rule grid grid-cols-[1fr_auto] items-start gap-6 py-7 transition-colors hover:bg-bg-soft/40"
              >
                <div>
                  <h3 className="text-[20px] font-medium tracking-[-0.02em] text-ink">
                    {r.title}
                  </h3>
                  <p className="mt-2 max-w-[440px] text-[15px] text-ink-2">
                    {r.body}
                  </p>
                </div>
                <span
                  className="text-[13px] text-ink-3"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {r.n}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
