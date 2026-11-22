'use client';

import { useState } from 'react';
import Hero from '@/components/Hero';
import StorefrontSandbox, { SessionRecord } from '@/components/StorefrontSandbox';
import UXPrinciples from '@/components/UXPrinciples';
import CaseStudyDrawer from '@/components/CaseStudyDrawer';

export default function Home() {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <main className="overflow-x-clip bg-[#07080B]">
      <Hero />
      <StorefrontSandbox sessions={sessions} onComplete={(r) => setSessions((s) => [...s, r])} />
      <UXPrinciples />
      <footer className="py-16 text-center text-sm text-white/30">AetherCommerce — Interactive HCI Research Testbed · Simulated Checkout Study (No Real Transactions).</footer>
      <CaseStudyDrawer isOpen={isOpen} setIsOpen={setIsOpen} sessions={sessions} />
    </main>
  );
}