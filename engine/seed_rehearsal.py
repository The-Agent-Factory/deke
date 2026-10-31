"""One-time seed: clips and text posts from "How to Run a Great Rehearsal" (youtu.be/J75D3PhzzL0),
plus the two live events Deke proposed on WhatsApp (Oct 22). Adds only ids not already in the bank."""
import json, os

BANK = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bank.json")
SRC = {"type": "youtube", "id": "J75D3PhzzL0"}
TAGS = "#acappella #choirdirector #rehearsal #singing #vocalharmony"


def note(t):
    return f"How to Run a Great Rehearsal (youtu.be/J75D3PhzzL0) at {t}"


def reel(id, prio, segs, framing, at, title, caption, tiktok):
    return {"id": id, "lane": "reel", "status": "idea", "priority": prio, "needs_deke": False, "source": SRC,
            "segments": segs, "framing": {"kind": framing}, "sourceNote": note(at),
            "copy": {"ytTitle": title, "caption": caption, "tiktok": f"{tiktok} {TAGS}"}}


ITEMS = [
    reel("rehearsal-director-performing", 9, [[772.96, 804.98]], "blur43", "12:53",
         "Directors: you are performing too, every rehearsal",
         "Your singers perform when they walk on stage. When you walk into rehearsal, you are performing too.\n\n"
         "Bring your energy, your personality and your plan, even on a lousy day. Leave the bad day at the door and "
         "bring into the room what you want your singers to give back to you.\n\nWhat do you do to switch on before rehearsal?",
         "Directors, you are performing too."),
    reel("rehearsal-pitch-tempo-mood", 8, [[392.5, 395.64], [443.92, 450.76], [468.8, 476.42]], "blur169", "6:32, 7:24, 7:48",
         "Pitch, tempo and mood: what singers need before every song",
         "The most important thing about any piece of music is the emotion.\n\nMost groups start a song with a pitch and a "
         "tempo. Give them the mood too. And never just run it from the top: the emotion should be there every single time "
         "you sing it.\n\nHow do you set the mood before a song?",
         "Pitch. Tempo. Mood."),
    reel("rehearsal-tshirts-at-the-end", 7, [[588.82, 599.82], [607.1, 631.14]], "blur43", "9:48, 10:07",
         "Never talk t-shirts at the start of rehearsal",
         "Business at the beginning of rehearsal is a balloon. It sucks up all the air in the room and takes as much time "
         "as it can.\n\nPut it in the last two minutes and the t-shirt debate takes thirty seconds. Better still, hand it "
         "to a committee.\n\nWhat is the longest off-topic discussion your group has had?",
         "Business goes at the END of rehearsal."),
    reel("rehearsal-start-on-time", 6, [[200.68, 233.14]], "blur43", "3:20",
         "Start rehearsal at 9:00 and zero seconds",
         "If rehearsal starts at 9, start singing at 9:00 and zero seconds.\n\nAnyone who walks in late gets the message: "
         "the rehearsal has started. People show up on time when they see that is the contract, and you get to say less "
         "because the music says it for you.\n\nDoes your group start on time?",
         "Start on time. Zero seconds."),
    reel("rehearsal-best-rehearsal-is-a-performance", 5, [[650.9, 653.08], [676.06, 692.58]], "blur43", "10:50, 11:16",
         "The best rehearsal is a performance",
         "The best rehearsal is a performance.\n\nGet your singers in front of people as often as you can. It does not need "
         "to be a real stage: the radio, a farmers market, the alumni, an all-school meeting, a nursing home. Sing "
         "everywhere.\n\nWhere is the oddest place your group has sung?",
         "The best rehearsal is a performance."),
    {"id": "text-record-the-last-take", "lane": "text", "status": "ready", "priority": 6, "needs_deke": False,
     "sourceNote": note("5:09 to 6:06"),
     "text": {
         "facebook": "At the end of every song you rehearse, say: this is the last time through. That is the cue for "
                     "everyone to pull out their phone and record it.\n\nThey listen on the way to the next rehearsal, sing "
                     "along, and walk in the door remembering how the bridge goes. You save the remedial time at the top of "
                     "rehearsal and get to the emotion much faster.\n\nDoes your group record its run-throughs?",
         "threads": "Last run-through of every song in rehearsal: phones out, record it. Your singers walk in next week "
                    "already remembering how the bridge goes.",
         "linkedin": "A small habit that saves a lot of rehearsal time for a cappella directors: record the last "
                     "run-through of every song.\n\nSingers listen on the way to the next rehearsal and arrive remembering "
                     "their parts, so the first twenty minutes go to music instead of review.\n\nWhat small habit has "
                     "changed your rehearsals the most?"}},
    {"id": "text-tuesday-emotion-saturday", "lane": "text", "status": "ready", "priority": 5, "needs_deke": False,
     "sourceNote": note("8:50 to 9:28"),
     "text": {
         "facebook": "You have an incredible, emotional run around the piano on Tuesday. Then Saturday comes and the "
                     "emotion is gone.\n\nThat happens when you stumble on the emotion instead of rehearsing it. If singers "
                     "make tones in every rehearsal, they will make tones on stage. Ask for the emotion every single time, "
                     "and every performance gets easier than the rehearsals.\n\nHas this happened to your group?",
         "threads": "Great on Tuesday, flat on Saturday? The emotion was an accident. Rehearse it every time and the "
                    "performance gets easier than the rehearsal.",
         "linkedin": "For a cappella directors: if the emotion shows up in rehearsal only by accident, it will not show "
                     "up on stage.\n\nAsk for it on every run-through. Theater actors never walk through their lines, and "
                     "singers should not either. Do it every time and the performance becomes easier than the "
                     "rehearsal.\n\nHow do you keep the emotion in rehearsal?"}},
    {"id": "event-2026-10-29-rehearsal-live", "lane": "text", "status": "ready", "priority": 10, "needs_deke": True,
     "needs_deke_reason": "Time of the Oct 29 live is not confirmed. Fill in [TIME], then set needs_deke false.",
     "notBefore": "2026-10-27", "notAfter": "2026-10-29",
     "sourceNote": "Deke's WhatsApp, Oct 22: live for a cappella directors on running a great rehearsal, with Q&A, Oct 29",
     "text": {
         "facebook": "Live this Thursday, October 29, at [TIME] ET: how to run a great rehearsal, for a cappella "
                     "directors. Bring your questions for the Q&A at the end.\n\nFree, inside the Total Vocal community.",
         "threads": "Thursday Oct 29, [TIME] ET: live on how to run a great rehearsal, then your questions. Free in "
                    "Total Vocal: skool.com/deke",
         "linkedin": "For a cappella directors: this Thursday, October 29 at [TIME] ET, I am running a free live "
                     "session on how to run a great rehearsal, followed by open Q&A, inside Total Vocal, my free a "
                     "cappella community."}},
    {"id": "event-2026-11-06-video-critique-live", "lane": "text", "status": "ready", "priority": 10, "needs_deke": True,
     "needs_deke_reason": "Nov 6 time not set, and the way members submit videos is not set up yet.",
     "notBefore": "2026-10-30", "notAfter": "2026-11-06",
     "sourceNote": "Deke's WhatsApp, Oct 22: live critique of member videos picked at random, Nov 6, earlier in the day",
     "text": {
         "facebook": "Send me your group's video. On Friday, November 6 at [TIME] ET I will go live and react to member "
                     "videos in real time: pause, comment and give notes as I hear them. I will not know which ones are "
                     "coming, so every video has the same chance.\n\nPost your link in the Total Vocal community to enter.",
         "threads": "Friday Nov 6: live video critique. Post your group's video in Total Vocal and it might get "
                    "picked. skool.com/deke",
         "linkedin": "On Friday, November 6, I am reviewing member videos live: pausing, commenting and giving notes "
                     "in real time. Videos are picked at random. Post yours in Total Vocal, my free a cappella "
                     "community, to enter."}},
]

bank = json.load(open(BANK, encoding="utf-8")) if os.path.exists(BANK) else {"items": []}
bank["_about"] = ("Deke content bank. Reels are clips of Deke speaking; text is built from his own words, with the "
                  "source recorded. status: idea > rendered > planned > scheduled. needs_deke items never auto-post.")
have = {i["id"] for i in bank["items"]}
added = [i for i in ITEMS if i["id"] not in have]
bank["items"] += added
json.dump(bank, open(BANK, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
print("added", len(added), "items; bank now", len(bank["items"]))
