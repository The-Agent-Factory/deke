"""Closed captions (SRT) for the Deke + Rasmus edit, on the edited program's timeline.

Same rules as engine/bill_biffle/build_captions.py (reuses its cue cutter, wrapper and splitter):
max 2 lines of 42 chars, 1 to 6 s, split at sentence ends and pauses, no em dashes.
Words: media/rasmus/main-words.json (clean pass), punctuation and case from punct-out.json (text-only pass,
word sequence verified unchanged here), plus the first pass for one crosstalk stretch the clean pass dropped.
Fixes: verified names and clear mishearings below, each tied to a source time (or everywhere).
Cold open: the three verified clip texts from edit.json.

Usage: python build_captions.py  -> <out>/rasmus-deke.en.srt + caption-report.json
"""
import json, re, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "bill_biffle"))
import build_captions as bc  # noqa: E402

CFG = json.load(open(Path(__file__).with_name("edit.json"), encoding="utf-8"))
M = Path(CFG["src"]).parent
OUT = Path(CFG["out"])
FIRST_PASS = Path(r"C:/Users/lafla/claude_projects/deke/media/engine/transcripts/rasmus-full.words.json")
SPLICE = (1681.0, 1688.9)   # "...a whole bunch of problems for me." / "You need to get in fewer pub fights." / "Bad luck."
FPS = 30
# Words inside a kept piece by timestamp but not audible in it (checked by re-transcribing each cut edge):
# "well" before cut 1 is clipped; "that's it, we" after the last line is the host wrap-up beyond the cut.
DROP = {(580.2, "well"), (3429.22, "that's"), (3429.46, "it"), (3429.5, "we")}


def tok(s):
    return re.sub(r"[^a-z0-9']", "", s.lower())


def punctuate(words):
    """Copy punctuation/case from punct-out.json onto the words, chunk by chunk, only where the
    word sequence is provably unchanged."""
    pin = {c["id"]: c for c in json.load(open(M / "punct-in.json", encoding="utf-8"))}
    pout = json.load(open(M / "punct-out.json", encoding="utf-8"))
    bad = []
    for c in pout:
        src = pin[c["id"]]
        new = c["text"].split()
        span = words[src["from"]:src["to"]]
        if len(new) != len(span) or any(tok(a["word"]) != tok(b) for a, b in zip(span, new)):
            bad.append(c["id"]); continue
        for w, t in zip(span, new):
            w["word"] = t
    return bad


def P(phrase):
    """Regex for a phrase: case-insensitive, any punctuation/space between its words."""
    toks = re.findall(r"[A-Za-z0-9']+", phrase)
    return r"\b" + r"[\s,.;:!?-]+".join(map(re.escape, toks)) + r"\b"


# (pattern, replacement, source-second or None for everywhere)
FIXES = [
    (r"(\w) -(\w)", r"\1-\2", None),                     # Whisper's "tax -funded" token split
    (r"(\d) %", r"\1%", None),
    (r"(\d) ,(\d{3})", r"\1,\2", None),
    (r"\b600 000\b", "600,000", None),
    (r"That's the\.", "That's the...", 3427),
    (r"^so there was music age one\.", "So, there was music, age one.", 616),
    (r"\bU\. S\.", "U.S.", None),
    (P("Ringmasters' first ever"), "Ringmasters, first ever", 15),
    (P("as Casual Guys"), "as casual guys", 90),
    (P("Frankie Valli in the Four Seasons"), "Frankie Valli and the Four Seasons", None),
    (P("frankie about in the four seasons"), "Frankie Valli and the Four Seasons", None),
    (P("than you did Barbershop"), "than you did barbershop", 95),
    (P("this is your life"), "This Is Your Life", 9),
    (P("math tradition"), "method, tradition", 293),
    (P("bring masters"), "Ringmasters", None),
    (r"\bringmasters\b", "Ringmasters", None),
    (P("zero eight"), "Zero8", None),
    (r"\b08\b", "Zero8", 3014),
    (P("lemon squeezy"), "Lemon Squeezy", None),
    (r"\bresmus\b", "Rasmus", None),
    (r"\brasmus\b", "Rasmus", None),
    (r"\bdenny\b", "Denny", None),
    (P("read the world became"), "the world became", 414),
    (P("has been in then of course asa base"), "has been, and then of course Ace of Base", 488),
    (P("the music man"), "The Music Man", 365),
    (r"\bh1\b", "age one", 617),
    (P("fifth H"), "fifth age", 776),
    (P("palestinian or bach"), "Palestrina or Bach", 709),
    (P("pop of the music industry"), "popular music industry", 884),
    (P("elephants gerald billy holly"), "Ella Fitzgerald, Billie Holiday", 908),
    (P("pearls open sound i"), "Pearls of the Sound.", 1070),
    (P("the doctors University"), "the doctors' university", 1104),
    (P("as a director character"), "as a director,", 1251),
    (P("the real group"), "The Real Group", 1362),
    (P("Eric Erickson's chamber choir"), "Eric Ericson Chamber Choir", 1436),
    (P("Eric Erickson"), "Eric Ericson", 1477),
    (r"\bachilles heels?\b", lambda m: "Achilles' heel" + ("s" if m.group(0).lower().endswith("s") else ""), None),
    (P("sight reading rhythm them hello"), "sight reading rhythm, hello", 1590),
    (P("went to Conservatory"), "went to conservatory", 1612),
    (P("2012 Metal Singing Lead"), "2012 medal singing lead", 1642),
    (P("celebrity cruises"), "Celebrity Cruises", 1726),
    (P("emmanuel and jacob"), "Emanuel and Jakob", 1752),
    (r"\bAmani\b", "Emanuel", 1817),
    (P("Victor Nielsen"), "Victor Nilsson", 1826),
    (P("people listening lead"), "people singing lead", 1842),
    (P("you're reading on this side"), "you're lead on this side", 1778),
    (P("robin tyson"), "Robin Tyson", None),
    (P("former king singer"), "former King's Singer", 1797),
    (r"\bmosaic\b", "Mosaic", 1864),
    (P("home free"), "Home Free", 1880),
    (P("the sing off"), "The Sing-Off", None),
    (P("the sing-off"), "The Sing-Off", None),
    (P("Steve Zegri"), "Steve Zegree", 1952),
    (P("steve's agree"), "Steve Zegree", 1967),
    (P("great envy so nathaniel"), "great. And so Nathaniel", 1977),
    (r"\bnathaniel\b", "Nathaniel", None),
    (P("agent in la"), "agent in L.A.", 1998),
    (P("cheat music"), "sheet music", 2018),
    (r"\bdo-ups\b", "doo-wops", 2019),
    (P("beach boys"), "Beach Boys", 2030),
    (P("notre dame"), "Notre Dame", 2100),
    (P("marty munson"), "Marty Monson", 2126),
    (P("david wright"), "David Wright", None),
    (r"\bmidwinter\b", "Midwinter", 2186),
    (P("the school community"), "the Skool community", 2230),
    (r"\bseth\b", "Seth", 2250),
    (r"\b[bv]hs\b", "BHS", None),
    (P("barbershop farming Society"), "Barbershop Harmony Society", 2283),
    (P("society of nordic barbershops singing"), "Society of Nordic Barbershop Singers", 2295),
    (r"\bsnobs\b", "SNOBS", None),
    (P("an injection"), "an interjection", 2341),
    (P("in a steadford"), "in an Eisteddfod", 2441),
    (P("like having whales"), "like you have in Wales", 2445),
    (r"\binterculture\b", "Interkultur", 2455),
    (P("world choir games"), "World Choir Games", None),
    (P("european grand prix"), "European Grand Prix", 2472),
    (P("coral stingers"), "choral singers", 2492),
    (P("of course America gathers"), "of course, Chorus America gathers", 2515),
    (P("out on websites and people there"), "out on their website. I send people there", 2528),
    (P("America has puts out"), "Chorus America puts out", 2645),
    (P("american coral directors association"), "American Choral Directors Association", 2650),
    (P("sing united"), "SingUnited", None),
    (P("tower records"), "Tower Records", 2675),
    (P("rolling stone"), "Rolling Stone", 2730),
    (P("water and coolers"), "water coolers", 2884),
    (P("usenet news groups"), "Usenet newsgroups", 2893),
    (P("pitch perfect"), "Pitch Perfect", None),
    (r"\bglee\b", "Glee", 2916),
    (r"\bpentatonix\b", "Pentatonix", None),
    (P("this school been around with the k"), "this Skool been around, with the K", 2849),
    (P("a course that has"), "a chorus that has", 3001),
    (P("joining school"), "joining Skool", 3009),
    (P("Deacon Rasmus"), "Deke and Rasmus", 3010),
    (P("brought me to school"), "brought me to Skool", 3083),
    (P("ben bram"), "Ben Bram", 3091),
    (P("to the new york vocal collective"), "the New York Vocal Collective", 3094),
    (P("Berkeley College of Music"), "Berklee College of Music", 3100),
    (r"\bchanticleer\b", "Chanticleer", None),
    (P("swedish radio choir"), "Swedish Radio Choir", None),
]


def fix_words(words, hits):
    """Apply FIXES on the running word list (so a phrase split across two cues is still caught).
    Replaced words share the time span of the words they replace."""
    for i, (pat, to, near) in enumerate(FIXES):
        text = " ".join(w["word"] for w in words)
        offs, p = [], 0
        for w in words:
            offs.append(p); p += len(w["word"]) + 1
        for m in reversed(list(re.finditer(pat, text, flags=re.I))):
            i0 = max(k for k, o in enumerate(offs) if o <= m.start())
            i1 = max(k for k, o in enumerate(offs) if o <= m.end() - 1)
            if near is not None and abs(words[i0]["start"] - near) > 25:
                continue
            repl = to(m) if callable(to) else m.expand(to)
            span = text[offs[i0]:offs[i1] + len(words[i1]["word"])]
            a, b = m.start() - offs[i0], m.end() - offs[i0]
            toks = (span[:a] + repl + span[b:]).split()
            t0, t1 = words[i0]["start"], words[i1]["end"]
            step = (t1 - t0) / max(1, len(toks))
            words[i0:i1 + 1] = [{"start": round(t0 + k * step, 3), "end": round(t0 + (k + 1) * step, 3), "word": t}
                                for k, t in enumerate(toks)]
            hits[i] += 1
    for w in words:
        t = re.sub(r"\bacapella\b", "a cappella", w["word"], flags=re.I)
        t = re.sub(r"\bi\b", "I", t)
        w["word"] = t.replace("\u2014", ",").replace("\u2013", ",").replace("\u2026", "...")
    return words


def main():
    words = json.load(open(M / "main-words.json", encoding="utf-8"))["words"]
    bad = punctuate(words)
    first = json.load(open(FIRST_PASS, encoding="utf-8"))["words"]
    words = ([w for w in words if w["start"] < SPLICE[0]] +
             [dict(w) for w in first if SPLICE[0] <= w["start"] < SPLICE[1]] +
             [w for w in words if w["start"] >= SPLICE[1]])
    plan = json.load(open(OUT / "plan.json"))
    # group touching main pieces into continuous source runs; each run is captioned on its own
    runs = []
    for p in plan["main"]:
        s, e = p["src"]
        if runs and abs(runs[-1]["e"] - s) < 0.02:
            runs[-1]["e"] = e
        else:
            runs.append({"s": s, "e": e, "at": p["at"]})
    out = []
    hits = {i: 0 for i in range(len(FIXES))}
    for r in runs:
        # word times run ~0.1-0.4 s early at the cut points; edges pinned to the clip re-transcriptions
        ws = bc.premerge([dict(w) for w in words if r["s"] - 0.1 <= w["start"] < r["e"] - 0.05
                          and (round(w["start"], 2), tok(w["word"])) not in DROP])
        ws = fix_words(ws, hits)
        cues = bc.cues_from(ws)
        for c in cues:
            c["end"] = min(c["end"], r["e"])
        out.append((r, cues))
    report = {"applied": sum(1 for v in hits.values() if v), "total_replacements": sum(hits.values()),
              "unused": [FIXES[i][0] for i, v in hits.items() if not v]}
    prog = []
    for r, cues in out:
        shift = r["at"] - bc.fr(r["s"])
        for c in bc.split_long(cues):
            prog.append({"start": c["start"] + shift, "end": c["end"] + shift, "text": c["text"]})
    cold = []
    for c, (_, _, text) in zip(plan["cold"], CFG["cold"]):
        dur = c["src"][1] - c["src"][0]
        parts, cur = [], ""
        for w in text.split():
            if len(cur + " " + w) > bc.MAXC * bc.MAXL - 10:
                parts.append(cur.strip()); cur = ""
            cur += " " + w
        parts.append(cur.strip())
        total = sum(len(p) for p in parts)
        t = c["at"] + 0.2
        for p in parts:
            d = (dur - 0.4) * len(p) / total
            cold.append({"start": t, "end": t + d - 0.04, "text": p}); t += d
    allc = cold + prog
    for c in allc:
        assert "\u2014" not in c["text"]
    with open(OUT / "rasmus-deke.en.srt", "w", encoding="utf-8") as f:
        for i, c in enumerate(allc, 1):
            f.write(f"{i}\n{bc.srt_time(c['start'])} --> {bc.srt_time(c['end'])}\n{bc.wrap(c['text'])}\n\n")
    report.update(cues=len(allc), punct_chunks_rejected=bad)
    json.dump(report, open(OUT / "caption-report.json", "w"), indent=1)
    print(f"{len(allc)} cues; fixes used {report['applied']}/{len(FIXES)} ({report['total_replacements']} replacements);"
          f" punctuation chunks rejected: {bad}")
    for u in report["unused"]:
        print("  unused fix:", u)


if __name__ == "__main__":
    main()
