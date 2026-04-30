"use client";

import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { motion, useScroll, useTransform } from "motion/react";

interface FinalCTAProps {
  onWaitlistClick: () => void;
}

export function FinalCTA({ onWaitlistClick }: FinalCTAProps) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const photoScale = useTransform(scrollYProgress, [0, 1], [1.04, 1.18]);
  const photoY = useTransform(scrollYProgress, [0, 1], ["0%", "-10%"]);

  return (
    <section ref={ref} className="relative">
      <div className="relative overflow-hidden bg-bg-deep py-28 md:py-40">
        <motion.div
          style={{ scale: photoScale, y: photoY }}
          className="pointer-events-none absolute inset-0 opacity-50"
        >
          <img
            src="https://images.unsplash.com/photo-1519681393784-d120267933ba?w=2200&q=80&auto=format&fit=crop"
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </motion.div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-bg-deep/40 via-bg-deep/70 to-bg-deep" />

        <div className="container-x relative">
          <div className="grid grid-cols-1 gap-y-12 md:grid-cols-2 md:gap-x-16">
            <motion.h2
              initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="text-[44px] leading-[1.02] tracking-[-0.045em] text-bg md:text-[80px]"
              style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
            >
              Your business
              <br />
              runs on <span className="editorial-italic">money.</span>
            </motion.h2>
            <motion.h2
              initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="text-[44px] leading-[1.02] tracking-[-0.045em] text-bg md:mt-32 md:text-[80px]"
              style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
            >
              Money should run on{" "}
              <span className="editorial-italic">better</span> infrastructure.
            </motion.h2>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-20 flex flex-col items-start gap-6 md:mt-28 md:items-center"
          >
            <button
              type="button"
              onClick={onWaitlistClick}
              className="magnet"
            >
              <span className="pill pill-light">
                Open an account
                <ArrowRight className="size-4" strokeWidth={1.6} />
              </span>
            </button>
            <p className="max-w-md text-[14px] text-[#9a988e] md:text-center">
              Useroutr v1 launches on Stellar, Ethereum, and Base mainnets in
              Q3 2026. The waitlist gets early access, the Slack channel with
              the team, and integration help in the first month.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
