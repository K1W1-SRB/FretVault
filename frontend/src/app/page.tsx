"use client";
import GuitarStringsSection from "@/components/guitar-string-section";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { ArrowRight, Music, BarChart3, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LandingPage() {
  const router = useRouter();

  const handleAuth = () => {
    router.push("/auth");
  };
  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-neutral-800">
        <h1 className="text-2xl font-bold tracking-tight">FretVault</h1>
        <nav className="hidden md:flex gap-8 text-sm text-neutral-400">
          <a href="#features" className="hover:text-white transition-colors">
            Features
          </a>
          <a href="#pricing" className="hover:text-white transition-colors">
            Pricing
          </a>
          <a href="#community" className="hover:text-white transition-colors">
            Community
          </a>
        </nav>
        <Button
          onClick={handleAuth}
          className="bg-white text-black font-semibold rounded-xl hover:bg-neutral-200 transition-colors"
        >
          Sign In
        </Button>
      </header>

      {/* Hero Section */}
      <section className="flex flex-col md:flex-row items-center justify-between flex-grow px-12 py-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-xl"
        >
          <h2 className="text-5xl font-bold leading-tight mb-6">
            The Ultimate Guitar Learning Partner
          </h2>
          <p className="text-neutral-400 mb-8 text-lg">
            Track your progress, learn new songs, and grow your skills with
            intelligent chord analysis and personalized practice tools.
          </p>
          <div className="flex gap-4">
            <Button
              size="lg"
              className="bg-teal-500 hover:bg-teal-400 font-semibold rounded-xl"
            >
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-neutral-700 text-neutral-300 rounded-xl hover:bg-neutral-900"
            >
              Learn More
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="mt-12 md:mt-0"
        >
          <Image
            src="/images/guitar-hero-illustration.png"
            alt="Guitar Practice"
            width={480}
            height={320}
            className="w-[480px] rounded-2xl shadow-lg"
            priority
          />
        </motion.div>
      </section>

      <GuitarStringsSection />

      {/* Features Section */}
      <section id="features" className="px-12 py-24 bg-[#111111]">
        <h3 className="text-3xl font-bold text-center mb-16">
          Why Choose FretVault?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card className="bg-neutral-900 border-neutral-800 rounded-2xl shadow-md">
            <CardContent className="p-8 text-center">
              <Music className="mx-auto mb-4 text-teal-400 h-10 w-10" />
              <h4 className="font-semibold text-xl mb-2">Smart Song Library</h4>
              <p className="text-neutral-400 text-sm">
                Organize, edit, and analyze your favorite songs with ease using
                AI-powered chord recognition.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-neutral-900 border-neutral-800 rounded-2xl shadow-md">
            <CardContent className="p-8 text-center">
              <BarChart3 className="mx-auto mb-4 text-teal-400 h-10 w-10" />
              <h4 className="font-semibold text-xl mb-2">Progress Tracking</h4>
              <p className="text-neutral-400 text-sm">
                Visualize your practice sessions and track your improvement with
                detailed analytics.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-neutral-900 border-neutral-800 rounded-2xl shadow-md">
            <CardContent className="p-8 text-center">
              <Users className="mx-auto mb-4 text-teal-400 h-10 w-10" />
              <h4 className="font-semibold text-xl mb-2">
                Collaborative Learning
              </h4>
              <p className="text-neutral-400 text-sm">
                Share songs, tabs, and sessions with friends or bandmates and
                learn together.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-800 py-8 px-12 text-center text-neutral-500 text-sm">
        <p>© {new Date().getFullYear()} FretVault. All rights reserved.</p>
      </footer>
    </div>
  );
}
