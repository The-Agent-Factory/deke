"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Check, ChevronDown, BookOpen, Info, X } from "lucide-react";

interface WorkshopTopic {
  title: string;
  description?: string;
}

const popularTopics: WorkshopTopic[] = [
  {
    title: "Masterclasses (length varies)",
    description: "The most popular format: a group performs for all attendees, and then I work with them live. All styles and levels are welcome — the topics covered relate to groups and singers universally. Often a group sings a song that isn't working well for them so we can dig in, find the challenges, and overcome them. Usually 20-30 minutes per group."
  },
  {
    title: "Pitch Perfect Singalong (90-120 min)",
    description: "Think the a cappella scenes in the Pitch Perfect movies are fun? They're even more fun when you're inside the harmonies! Singers of all ages learn an arrangement from the movie on the spot, hear hilarious behind-the-scenes stories, and — if you'd like — sing one of the solos. From London to New Zealand this has drawn hundreds per event. No pressure, no stress, all levels welcome."
  },
  {
    title: "History of A Cappella, 1900-Present",
    description: "From the earliest recording of vocal harmony to Pentatonix, a look (and listen) at the global styles and traditions that shaped the contemporary a cappella sound — barbershop, doo wop, gospel, South African mbube, vocal jazz and more. (Requires audio playback: speakers and an 1/8th inch cable.)"
  },
  {
    title: "The Heart of Vocal Harmony",
    description: "Drawn from my book of the same name, this process pulls from diverse fields such as psychology and theater to teach directors and singers how to get vocal harmony groups of all ages and sizes to perform every song in their repertoire with genuine, unified emotion."
  },
  {
    title: "Singing Instruments",
    description: "Ten years ago a cappella was mostly “bum” and “doo.” Now people sound like drums, guitars, horns and a myriad of other instruments. Learn how to use one or many voices to sound like instruments and weave them into your arrangements. Very popular — can be combined with Beginning Vocal Percussion."
  },
  {
    title: "Beginning Vocal Percussion",
    description: "One of the most notable elements of contemporary a cappella. Learn the fundamentals — weaving together bass drum, snare and high hat into a compelling groove — and begin to explore additional sounds like cymbals, shakers, and wood blocks."
  },
  {
    title: "Contemporary A Cappella Arranging in 10 Steps",
    description: "Contemporary a cappella has brought a dynamic, rhythmic sound that differentiates it from barbershop, doo wop, and close harmony. Learn how to create a great contemporary arrangement using a tried-and-true 10-step formula."
  },
  {
    title: "Advanced A Cappella Arranging",
    description: "There are few places in the world to study music arranging, and even fewer that teach arranging a cappella. This seminar offers ideas and discussion to further develop advanced arrangers' skills, plus direct feedback on attendee arrangements. Can be combined with Arranging Critique."
  },
  {
    title: "Stage Presence",
    description: "Performing a cappella is about much more than singing in tune and rhythm — it's about bringing all of yourself to the stage (body, mind and emotions) and using every parameter of the performing space to maximize your impact and create a memorable experience. This workshop is interactive."
  },
  {
    title: "Close Harmony Blend / Improving Tuning",
    description: "We all want the best blend possible — but how? By examining the four dimensions that define all sound (pitch, duration, loudness and timbre), learn to hear what hinders the alignment of each harmony and how to improve your group's blend through a series of exercises, all without compromising energy and impact."
  },
  {
    title: "Expert Level Music Director's Toolkit",
    description: "My best tips for directors ready to take their group's sound to the next level. Learn how to harness the physics of sound, make vocal textures more instrumental, increase tuning, blend and rhythmic accuracy, and turn a wooden choral melody into a smooth pop phrase."
  },
  {
    title: "Inspiring Young Singers through Contemporary A Cappella",
    description: "Popular a cappella has inspired hundreds of thousands of young singers — and now it's reaching younger ones. Learn how to teach different styles, create blend, lock in tuning and solidify a groove while inspiring the next generation. For everyone from experienced choral educators to singers looking to start a program."
  },
];

const additionalTopics: WorkshopTopic[] = [
  {
    title: "Introduction to Choral Pop Techniques",
    description: "An interactive class for singers used to choir who don't have experience singing popular music in a choral setting. All ages, levels and languages welcome as we break down barriers, debunk myths, and find a great, healthy pop sound for choral music."
  },
  {
    title: "Arranging Mashups",
    description: "Popularized by the Pitch Perfect franchise, mashups are more than medleys — songs are interwoven, requiring careful consideration of tempo, key, theme, and melodic shape. Learn how some of your favorite mashups were built, and how to create them yourself from scratch."
  },
  {
    title: "Arranging Critique",
    description: "An opportunity for arrangers of all levels to bring a copy of their arrangement to be sung by the seminar attendees, then discussed and critiqued in an open forum."
  },
  {
    title: "Singing Games and Improvisation",
    description: "Most world cultures have a tradition of a cappella singing that relies on nothing but ear and voice. Learn to improvise pop songs, sing a “circle song,” and make music without rules or boundaries. Great as warmups, for building focus and precision, or for growing confidence in improvisation."
  },
  {
    title: "Songwriting & Arranging",
    description: "Songwriting doesn't require an enormous amount of music theory — you probably make up little songs all the time. The same goes for arranging, done by ear for most of human history. Learn how to take an idea, turn it into a song, and turn that song into an arrangement. All levels welcome."
  },
  {
    title: "VoiceScapes",
    description: "For events: after learning to improvise, we set up locations throughout the venue where themed improvisations take place (“ocean” in a room flooded with blue light, “heaven” in a chapel on Sunday morning, “spring” in a garden). These finite improvisations are open to singers and listeners alike."
  },
  {
    title: "Development of Style",
    description: "You've sung the standards and know other groups' biggest songs. Now what? Learn how to take your group's unique strengths and interests and build them into a style that's all your own — musically as well as visually and in performance."
  },
  {
    title: "Managing Rehearsals",
    description: "The nitty-gritty issues that sometimes make you crazy: teaching notes vs. learning tracks, songs per rehearsal, attendance, sectionals vs. group rehearsal, warm-up time, when to allow mistakes vs. stop and fix them, rehearsal discipline, and balancing fun with musicality."
  },
  {
    title: "Performance Presentation",
    description: "A great vocal music performance is about much more than singing. How do you greet the audience? What are you wearing? How do you move during songs? How is your show paced? This seminar addresses every aspect of performing on stage besides singing."
  },
  {
    title: "Composition",
    description: "Many people write music, but few do it with an understanding of the strengths and challenges of an a cappella ensemble. Learn the fundamentals of songwriting and how to craft a piece that makes the most of your “instrument”: the human voice."
  },
  {
    title: "Music Direction",
    description: "The director's role is the most important and influential in any a cappella group, combining musician, leader, organizer, consensus builder and conductor. Learn techniques and tips to maximize rehearsal time and minimize friction between singers."
  },
  {
    title: "Group Dynamics",
    description: "The loudmouth. The quiet one. The organizer. The flake. Using materials and techniques developed for the corporate world, learn how groups interact and how your ensemble can understand each other, minimize friction, and work together in harmony to create harmony."
  },
  {
    title: "A Cappella Business and Management",
    description: "We all wish we could just sing and have money show up in the bank account. This seminar covers a wide range of topics to streamline your business and focus on your craft, including your group's legal structure, leadership, division of responsibilities, and working with agents and managers."
  },
  {
    title: "Starting A Group",
    description: "There's no need to learn the hard way! From conceptualization through your first performance, learn the best way to find members, run auditions, structure your group, build a quick repertoire, and start performing. For all ages and levels — scholastic, pro, and community choirs."
  },
  {
    title: "Producing an Album",
    description: "Nowadays people make chart-topping, award-winning recordings on a laptop at home. From pre-production to recording, editing (tuning and rhythmic alignment), mixing, mastering, and manufacturing, learn how to make a professional vocal music recording."
  },
  {
    title: "A Cappella Promotional Kit",
    description: "It doesn't matter how talented your group is — without the proper press materials and audio/video demos you won't get gigs or media recognition. Follow these specific guidelines and you'll have a set of materials that impress even the most jaded promoter or editor."
  },
  {
    title: "Introduction to Contemporary A Cappella",
    description: "What is “Contemporary A Cappella,” and where did it come from? Trace the roots of pop a cappella from chant and madrigals through barbershop and doo-wop, with a look at how all previous styles have influenced the contemporary sound."
  },
  {
    title: "Solo Delivery",
    description: "Singing a solo is more than technique — it involves understanding the material, emotional commitment, and the support of your ensemble. Bring the lyrics for a solo and we'll analyze, discuss, and practice being “in the moment” when you sing."
  },
  {
    title: "Sound Check & Basic Tech",
    description: "Too often a great a cappella performance is hindered by imperfect amplification. Learn the basics of microphones, monitors, sound boards and EQ, how to avoid the most common pitfalls, and how to run a productive sound check for a great amplified performance."
  },
  {
    title: "Competition Tips",
    description: "From the International Championship of Collegiate A Cappella and the Harmony Sweepstakes to local festivals, competing is one of the best ways to make a name for your group. Find out how to put on a great competition performance, gain new fans, and make the most of the experience."
  },
  {
    title: "Singing by the Numbers",
    description: "Want to sing a cappella harmony without any sheet music? Using the diatonic scale (“do-re-mi”), learn to use your ear and some very basic theory to create interesting background parts to a wide variety of songs. The seminar ends with groups spontaneously creating arrangements."
  },
  {
    title: "Staging and Movement",
    description: "Learn the basic principles of how to position singers on stage to maximize tuning, rhythmic unity and connection with the audience, plus the core principles of great a cappella choreography like you've seen in Pitch Perfect and The Sing-Off."
  },
  {
    title: "Vocal Technique for A Cappella Singers",
    description: "Some principles hold regardless of style, but some apply specifically to an a cappella ensemble. Learn the best techniques for singing off-mic, on-mic, and when you want to sound like an instrument."
  },
  {
    title: "Careers in A Cappella",
    description: "There are dozens of part- and full-time job opportunities for lovers of a cappella. Hear a list of these careers, what they entail, and words of wisdom from the biggest names in vocal harmony (taken from my book “So You Want To Sing A Cappella”)."
  },
  {
    title: "The Future of A Cappella",
    description: "What are the biggest trends? Where are the biggest growth markets? Where can young professionals find opportunities? A 30,000-foot view of the domestic and global vocal music scene, intended for well-informed insiders and casual fans alike."
  },
  {
    title: "Introduction to Pop and Jazz Choirs",
    description: "A look at the sound and style of what makes a choir different from a small ensemble, with video/audio and sheet music examples from groups around the world."
  },
  {
    title: "History of American A Cappella, 1900-Present",
    description: "From the earliest recording of vocal harmony to Pentatonix, a look (and listen) at the American styles and traditions that shaped the contemporary sound — barbershop, doo wop, gospel, vocal jazz and more. The same lecture as History of A Cappella, focused on American groups and traditions. (Requires audio playback.)"
  },
  {
    title: "Arranging in Different Styles of Popular A Cappella",
    description: "Popular a cappella has changed a great deal worldwide over the past 130 years. Listen and learn how to organize your singers to create a wide range of vocal styles including vocal jazz, doo wop, barbershop, and of course contemporary a cappella."
  },
  {
    title: "Reality Competition Shows",
    description: "How they work and how to win! A reality competition show is a top opportunity for exposure. But how do the shows work, and how can your group navigate the conflicting messages and stressful conditions? Learn what a show runner is, how their goals differ from the executives', and how to get your group cast and on the fast track to the finale."
  },
  {
    title: "Viral Videos: The Future of A Cappella",
    description: "Since the advent of YouTube, nearly every successful new group launched on video — Pentatonix's “couch” videos, Straight No Chaser's “12 Days of Christmas,” Maytree's soundtrack videos. By analyzing the biggest a cappella videos of the past 20 years, we'll identify how to make your group the next viral sensation."
  },
  {
    title: "Question and Answer",
    description: "Often the last seminar of the day: an open question-and-answer period for attendees to raise issues specific to their group, or to tie together multiple concepts raised earlier in the day."
  },
];

function TopicItem({ topic, index }: { topic: WorkshopTopic; index: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.02 }}
    >
      <button
        onClick={() => topic.description && setIsOpen(!isOpen)}
        className={`w-full text-left flex items-start gap-2 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors ${
          topic.description ? "cursor-pointer" : "cursor-default"
        }`}
      >
        <Check className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
        <span className="text-sm flex-1">{topic.title}</span>
        {topic.description && (
          <Info className={`h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0 transition-colors ${isOpen ? "text-accent" : ""}`} />
        )}
      </button>
      <AnimatePresence>
        {isOpen && topic.description && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 ml-7">
              <p className="text-sm text-muted-foreground bg-accent/5 border border-accent/10 rounded-lg p-3">
                {topic.description}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function WorkshopTopicsSection() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section className="py-20 md:py-28 bg-secondary/30" id="workshops">
      <div className="container px-4 md:px-6 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 md:mb-12"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <BookOpen className="h-4 w-4" />
            Workshop Catalog
          </span>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Workshop & Seminar Topics
          </h2>
          <p className="text-lg text-muted-foreground">
            40+ specialized topics, custom-tailored to your group&apos;s needs and demographics
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Click any topic with <Info className="h-3 w-3 inline" /> to learn more
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="border-0 shadow-elevated">
            <CardContent className="pt-6 md:pt-8">
              <div className="space-y-4 mb-6">
                <h3 className="font-heading text-xl md:text-2xl font-bold">
                  Popular Workshops
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {popularTopics.map((topic, i) => (
                    <TopicItem key={topic.title} topic={topic} index={i} />
                  ))}
                </div>
              </div>

              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center justify-between w-full p-4 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all duration-300 group"
              >
                <span className="font-semibold">
                  {isExpanded ? "Show Less" : "View All 40+ Topics"}
                </span>
                <ChevronDown
                  className={`h-5 w-5 transition-transform duration-300 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="grid sm:grid-cols-2 gap-3 mt-6 pt-6 border-t">
                      {additionalTopics.map((topic, i) => (
                        <TopicItem key={topic.title} topic={topic} index={i} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-6 p-4 bg-accent/10 border border-accent/20 rounded-xl">
                <p className="text-sm text-center">
                  <span className="font-semibold">All workshops are custom-tailored</span>{" "}
                  to your group&apos;s specific needs, interests, skill level, and demographics.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
