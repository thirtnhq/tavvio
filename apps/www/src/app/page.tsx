"use client";

import { useState } from "react";
import { Navbar } from "@/components/site/Navbar";
import { Hero } from "@/components/site/Hero";
import { TrustStrip } from "@/components/site/TrustStrip";
import { HowItWorks } from "@/components/site/HowItWorks";
import { Differentiators } from "@/components/site/Differentiators";
import { ForDevelopers } from "@/components/site/ForDevelopers";
import { ForBusinesses } from "@/components/site/ForBusinesses";
import { PricingTeaser } from "@/components/site/PricingTeaser";
import { Security } from "@/components/site/Security";
import { FinalCTA } from "@/components/site/FinalCTA";
import { Footer } from "@/components/site/Footer";
import { WaitlistModal } from "@/components/site/WaitlistModal";

export default function Home() {
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const openWaitlist = () => setWaitlistOpen(true);

  return (
    <>
      <Navbar onWaitlistClick={openWaitlist} />
      <main>
        <Hero onWaitlistClick={openWaitlist} />
        <TrustStrip />
        <HowItWorks />
        <Differentiators />
        <ForDevelopers />
        <ForBusinesses onWaitlistClick={openWaitlist} />
        <PricingTeaser />
        <Security />
        <FinalCTA onWaitlistClick={openWaitlist} />
      </main>
      <Footer />
      <WaitlistModal open={waitlistOpen} onOpenChange={setWaitlistOpen} />
    </>
  );
}
