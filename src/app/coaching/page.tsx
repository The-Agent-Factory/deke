"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TotalVocalCrosslink } from "@/components/total-vocal-crosslink";
import {
  Users,
  User,
  Clock,
  CheckCircle2,
  ArrowRight,
  Video,
  Mic2,
  Heart,
  Zap,
} from "lucide-react";

const groupPackages = [
  {
    name: "Group Intensive",
    duration: "Half-day (4 hours)",
    description: "Focused session on specific challenges or repertoire",
    features: [
      "4 hours of hands-on coaching",
      "Blend and balance refinement",
      "Repertoire analysis",
      "Performance techniques",
      "Group dynamics assessment",
      "Follow-up notes & recordings",
    ],
  },
  {
    name: "Full Day Workshop",
    duration: "Full day (8 hours)",
    description: "Comprehensive transformation for competition-ready groups",
    popular: true,
    features: [
      "8 hours of intensive coaching",
      "Multiple repertoire pieces",
      "Vocal health techniques",
      "Arranging fundamentals",
      "Competition preparation",
      "Video recording of session",
      "30-day email support",
    ],
  },
  {
    name: "Season Package",
    duration: "4 sessions over 3 months",
    description: "Long-term development for serious groups",
    features: [
      "Four full-day sessions",
      "Competition strategy planning",
      "Repertoire consultation",
      "Monthly video check-ins",
      "Direct text/email access",
      "Priority arrangement slots",
      "Showcase performance review",
    ],
  },
];

const individualOptions = [
  {
    name: "Single Session",
    duration: "1 hour",
    description: "Perfect for specific challenges or quick tune-ups",
  },
  {
    name: "5-Session Pack",
    duration: "5 hours total",
    description: "Consistent development with dedicated focus areas",
  },
  {
    name: "Monthly Mentorship",
    duration: "2 sessions + support",
    description: "Ongoing guidance for directors and arrangers",
  },
];

const focuses = [
  { icon: Mic2, title: "Blend & Balance", description: "Creating unified sound" },
  { icon: Users, title: "Group Dynamics", description: "Building ensemble chemistry" },
  { icon: Video, title: "Stage Presence", description: "Captivating performances" },
  { icon: Clock, title: "Rehearsal Efficiency", description: "Maximizing practice time" },
];

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function CoachingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-hero py-20 md:py-28">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-white/[0.02] rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-white/[0.02] rounded-full blur-3xl" />
        </div>

        <div className="container relative z-10 px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl text-white"
          >
            <Badge variant="outline" className="mb-4 border-white/20 text-white/80 bg-white/5">
              <Users className="h-3 w-3 mr-1" />
              Vocal Coaching
            </Badge>
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight mb-6">
              Unlock Your Group's{" "}
              <span className="text-gold">Full Potential</span>
            </h1>
            <p className="text-xl text-white/70 mb-8 leading-relaxed">
              Whether you're preparing for competition, polishing for a big
              show, or simply want to sound better, I'll help you discover
              the sound you didn't know you had.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="accent" size="lg" asChild>
                <Link href="/booking?service=coaching">
                  Book Coaching Session
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="border-white/20 text-white hover:bg-white/10 hover:text-white" asChild>
                <Link href="#individual">
                  <User className="mr-2 h-4 w-4" />
                  Individual Coaching
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Coaching Focuses */}
      <section className="py-16 bg-section-alt">
        <div className="container px-4 md:px-6">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-2 md:grid-cols-4 gap-6"
          >
            {focuses.map((focus) => (
              <motion.div key={focus.title} variants={fadeInUp} className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-foreground">
                  <focus.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-heading font-semibold text-sm">{focus.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {focus.description}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Group Packages */}
      <section className="py-20 md:py-28">
        <div className="container px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-heading text-3xl md:text-4xl font-semibold tracking-tight mb-4">
              Transform Your Ensemble
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              In-person or virtual sessions tailored to your group's specific
              needs, goals, and current skill level.
            </p>
          </motion.div>

          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid gap-8 md:grid-cols-3"
          >
            {groupPackages.map((pkg) => (
              <motion.div key={pkg.name} variants={fadeInUp}>
                <Card
                  className={`flex flex-col h-full relative ${
                    pkg.popular ? "border-accent shadow-elevated" : ""
                  }`}
                >
                  {pkg.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground">
                      <Zap className="h-3 w-3 mr-1" />
                      Best Value
                    </Badge>
                  )}
                  <CardHeader className="text-center pb-2 pt-8">
                    <Badge variant="outline" className="w-fit mx-auto mb-2">
                      {pkg.duration}
                    </Badge>
                    <CardTitle className="font-heading text-xl">
                      {pkg.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                      {pkg.description}
                    </p>
                  </CardHeader>
                  <CardContent className="pt-6 flex-1 flex flex-col">
                    <ul className="space-y-3 mb-6 flex-1">
                      {pkg.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      variant={pkg.popular ? "default" : "outline"}
                      asChild
                    >
                      <Link href={`/booking?service=coaching&package=${pkg.name.toLowerCase().replace(/ /g, '-')}`}>
                        Book Now
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Individual Coaching */}
      <section id="individual" className="py-20 md:py-28 bg-section-alt">
        <div className="container px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-heading text-3xl md:text-4xl font-semibold tracking-tight mb-4">
              One-on-One Development
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Personalized coaching for directors, arrangers, and individual
              vocalists looking to elevate their craft.
            </p>
          </motion.div>

          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto"
          >
            {individualOptions.map((option) => (
              <motion.div key={option.name} variants={fadeInUp}>
                <Card className="h-full">
                  <CardContent className="pt-6 text-center">
                    <div className="font-heading font-semibold text-lg mb-1">
                      {option.name}
                    </div>
                    <Badge variant="outline" className="mb-3">
                      {option.duration}
                    </Badge>
                    <p className="text-sm text-muted-foreground mb-4">
                      {option.description}
                    </p>
                    <Button variant="outline" className="w-full" asChild>
                      <Link href={`/booking?service=individual&package=${option.name.toLowerCase().replace(/ /g, '-')}`}>
                        Book Session
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <TotalVocalCrosslink
        heading="Not ready to book private coaching?"
        body="Total Vocal is the global community where Deke coaches singers, directors and arrangers every month. Live calls, arranging courses, and feedback on your group's sound."
      />

      {/* CTA */}
      <section className="py-20 md:py-28 bg-gradient-hero text-white">
        <div className="container px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center"
          >
            <Heart className="h-12 w-12 mx-auto mb-6 text-gold" />
            <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight mb-6">
              Let's Create Your <span className="text-gold">Breakthrough</span>
            </h2>
            <p className="text-white/70 text-lg max-w-2xl mx-auto mb-10">
              Every great vocal group has a moment when everything clicks.
              Let me help you find yours.
            </p>
            <Button variant="accent" size="xl" asChild>
              <Link href="/booking?service=coaching">
                Schedule Your Session
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>
    </>
  );
}
