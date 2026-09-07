"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TotalVocalCrosslink } from "@/components/total-vocal-crosslink";
import { WorkshopTopicsSection } from "@/components/landing";
import {
  Calendar,
  MapPin,
  Users,
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Trophy,
  Building2,
} from "lucide-react";

const workshopTypes = [
  {
    icon: GraduationCap,
    title: "School Programs",
    description:
      "Multi-day residencies for high school and college programs looking to establish or elevate their a cappella offerings.",
    features: [
      "Curriculum development",
      "Student workshops",
      "Faculty training",
      "Concert coaching",
      "Program assessment",
    ],
  },
  {
    icon: Trophy,
    title: "Competition Prep",
    description:
      "Intensive preparation for ICCA, ICHSA, Harmony Sweepstakes, and other major competitions.",
    features: [
      "Set design & flow",
      "Arrangement polish",
      "Staging & choreography",
      "Judge perspective insights",
      "Performance simulation",
    ],
  },
  {
    icon: Calendar,
    title: "Festival Clinics",
    description:
      "Multi-group sessions at festivals, conferences, and special events.",
    features: [
      "Keynote presentation",
      "Multiple group coaching",
      "Open workshops",
      "Q&A sessions",
      "Networking facilitation",
    ],
  },
  {
    icon: Building2,
    title: "Corporate Events",
    description:
      "Team-building through music for corporate retreats and conferences.",
    features: [
      "Team harmony building",
      "Communication exercises",
      "Group performance",
      "Leadership through music",
      "Custom content",
    ],
  },
];

const upcomingEvents = [
  {
    title: "ICCA West Quarterfinal Prep",
    location: "Los Angeles, CA",
    date: "February 15, 2025",
    spots: 8,
  },
  {
    title: "A Cappella Summit",
    location: "Boston, MA",
    date: "March 22-24, 2025",
    spots: 50,
  },
  {
    title: "High School Festival",
    location: "Nashville, TN",
    date: "April 10-12, 2025",
    spots: 20,
  },
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

export default function WorkshopsPage() {
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
              <Calendar className="h-3 w-3 mr-1" />
              Workshops & Clinics
            </Badge>
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight mb-6">
              Transform Your Program{" "}
              <span className="text-gold">in Days</span>
            </h1>
            <p className="text-xl text-white/70 mb-8 leading-relaxed">
              From single-day intensives to week-long residencies, I bring
              three decades of experience directly to your ensemble, school,
              or event.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="accent" size="lg" asChild>
                <Link href="/booking?service=workshop">
                  Request a Workshop
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="border-white/20 text-white hover:bg-white/10 hover:text-white" asChild>
                <Link href="#upcoming">Upcoming Events</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Workshop Types */}
      <section className="py-20 md:py-28">
        <div className="container px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-heading text-3xl md:text-4xl font-semibold tracking-tight mb-4">
              Choose Your Experience
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Every workshop is customized to your specific needs, goals, and
              participant skill levels.
            </p>
          </motion.div>

          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid gap-8 md:grid-cols-2"
          >
            {workshopTypes.map((workshop) => (
              <motion.div key={workshop.title} variants={fadeInUp}>
                <Card className="h-full transition-shadow hover:shadow-elevated">
                  <CardHeader>
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-foreground mb-2">
                      <workshop.icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="font-heading text-xl">
                      {workshop.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      {workshop.description}
                    </p>
                    <ul className="grid grid-cols-2 gap-2 mb-4">
                      {workshop.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button variant="outline" className="w-full" asChild>
                      <Link href={`/booking?service=workshop&type=${workshop.title.toLowerCase().replace(/ /g, '-')}`}>
                        Learn More
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Upcoming Events */}
      <section id="upcoming" className="py-20 md:py-28 bg-section-alt">
        <div className="container px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-heading text-3xl md:text-4xl font-semibold tracking-tight mb-4">
              Upcoming Workshops
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Join an open workshop or festival clinic near you.
            </p>
          </motion.div>

          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto"
          >
            {upcomingEvents.map((event) => (
              <motion.div key={event.title} variants={fadeInUp}>
                <Card className="h-full transition-shadow hover:shadow-elevated">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Calendar className="h-4 w-4" />
                      {event.date}
                    </div>
                    <h3 className="font-heading font-semibold text-lg mb-2">
                      {event.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                      <MapPin className="h-4 w-4" />
                      {event.location}
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">
                        <Users className="h-3 w-3 mr-1" />
                        {event.spots} spots left
                      </Badge>
                      <Button size="sm" asChild>
                        <Link href={`/booking?event=${event.title.toLowerCase().replace(/ /g, '-')}`}>
                          Register
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Full Workshop Topics Catalog */}
      <WorkshopTopicsSection />

      <TotalVocalCrosslink
        heading="Can't bring Deke to your group yet?"
        body="Total Vocal is the global community where Deke coaches singers, directors and arrangers every month. Live calls, arranging courses, and feedback on your group's sound."
      />

      {/* CTA */}
      <section className="py-20 md:py-28 bg-gradient-hero text-white">
        <div className="container px-4 md:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-heading text-3xl md:text-4xl font-semibold tracking-tight mb-4">
              Bring the Workshop to You
            </h2>
            <p className="text-white/70 max-w-2xl mx-auto mb-8 text-lg">
              I travel worldwide to work with groups, schools, and organizations.
              Let's design the perfect experience for your needs.
            </p>
            <Button variant="accent" size="lg" asChild>
              <Link href="/booking?service=workshop">
                Request a Custom Workshop
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>
    </>
  );
}
