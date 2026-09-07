"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users } from "lucide-react";

export function TotalVocalBanner() {
  return (
    <section className="py-16 md:py-20">
      <div className="container px-4 md:px-6 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
        >
          <Link href="/total-vocal" className="group block">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary/90 to-primary/80">
              {/* Background image */}
              <div className="absolute inset-0">
                <Image
                  src="/images/deke/2024_ACAPPELLA_SPECTACULAR_AB_0328.jpg"
                  alt="Singers celebrating together on stage at an a cappella spectacular"
                  fill
                  className="object-cover opacity-30 group-hover:opacity-40 transition-opacity duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/70 to-primary/50" />
              </div>

              {/* Content */}
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 p-8 md:p-12">
                <div className="flex items-center gap-4 md:gap-6">
                  <div className="flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex-shrink-0">
                    <Users className="h-7 w-7 md:h-8 md:w-8 text-white" />
                  </div>
                  <div className="text-white">
                    <h3 className="font-heading text-xl md:text-2xl font-semibold mb-1">
                      Can&apos;t book Deke in person?
                    </h3>
                    <p className="text-white/70 text-sm md:text-base">
                      Sing with him every month inside Total Vocal, the global
                      community for a cappella singers, directors and arrangers
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="border-white/30 text-white bg-white/5 hover:bg-white/15 shrink-0"
                >
                  Explore Total Vocal
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </div>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
