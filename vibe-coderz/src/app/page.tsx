"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/sections/Hero";
import { Services } from "@/components/sections/Services";
import { Portfolio } from "@/components/sections/Portfolio";
import { Contact } from "@/components/sections/Contact";
import { Background3D } from "@/components/3d/Background3D";
import { SmoothScroll } from "@/components/providers/SmoothScroll";

export default function Home() {
  return (
    <main className="min-h-screen text-white selection:bg-white selection:text-black relative">
      <Background3D />

      <SmoothScroll>
        <div className="relative z-10">
          <Header />
          <Hero />
          <Services />
          <Portfolio />
          <Contact />
          <Footer />
        </div>
      </SmoothScroll>
    </main>
  );
}
