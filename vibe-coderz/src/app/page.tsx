"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/sections/Hero";
import { Services } from "@/components/sections/Services";
import { Skills } from "@/components/sections/Skills";
import { Portfolio } from "@/components/sections/Portfolio";
import { Resume } from "@/components/sections/Resume";
import { Contact } from "@/components/sections/Contact";
import { Background3D } from "@/components/3d/Background3D";
import { Foreground3D } from "@/components/3d/Foreground3D";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <main className="min-h-screen text-white selection:bg-white selection:text-black relative">
      <Background3D />
      <Foreground3D />

      <div className="relative z-10">
        <Header />
        <Hero />
        <Services />
        <Skills />
        <Portfolio />
        <Resume />
        <Contact />
        <Footer />
      </div>
    </main>
  );
}
