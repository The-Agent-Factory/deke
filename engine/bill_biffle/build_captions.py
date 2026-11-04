"""Closed captions (SRT) for the Deke + Bill edit, on the edited program's timeline.

Words: cold-open clips from the clean clip transcripts, the conversation from main-words.json
(re-transcribed with punctuation). Verified name/term fixes from caption-fixes.json are applied to each
cue near the time they were found (case and punctuation tolerant). Cue rules: max 2 lines of 42 chars,
1 to 6 s, split at sentence ends and pauses.

Usage: python build_captions.py   (paths below)  -> edit/bill-biffle-deke.en.srt + caption-report.json
"""
import json, re

DIR = r"C:/Users/lafla/claude_projects/deke/media/bill-biffle"
FPS = 30
MAXC, MAXL = 42, 2


def fr(t):
    return round(t * FPS) / FPS


def mmss(s):
    m, x = s.split(":")
    return int(m) * 60 + float(x)


def cues_from(words):
    cues, cur = [], []
    for i, w in enumerate(words):
        cur.append(w)
        text = " ".join(x["word"] for x in cur)
        nxt = words[i + 1] if i + 1 < len(words) else None
        gap = (nxt["start"] - w["end"]) if nxt else 9
        dur = w["end"] - cur[0]["start"]
        end_sent = w["word"].endswith((".", "?", "!"))
        too_long = nxt and len(text + " " + nxt["word"]) > 76
        if not nxt or gap > 0.7 or too_long or dur > 5.5 or (end_sent and len(text) > 20):
            cues.append({"start": cur[0]["start"], "end": max(w["end"], cur[0]["start"] + 1.0), "text": text})
            cur = []
    for a, b in zip(cues, cues[1:]):  # never overlap the next cue
        a["end"] = min(a["end"], b["start"] - 0.04)
    return cues


def wrap(text):
    if len(text) <= MAXC:
        return text
    words, best = text.split(), None
    for k in range(1, len(words)):
        l1, l2 = " ".join(words[:k]), " ".join(words[k:])
        if len(l1) <= MAXC and len(l2) <= MAXC:
            score = abs(len(l1) - len(l2))
            if best is None or score < best[0]:
                best = (score, l1 + "\n" + l2)
    return best[1] if best else text


def norm_pat(s):
    """Regex for a phrase, tolerant of case, punctuation and spacing between its words."""
    toks = re.findall(r"[A-Za-z0-9']+", s)
    return re.compile(r"\b" + r"[\s,.;:!?-]+".join(map(re.escape, toks)) + r"\b", re.I) if toks else None


def apply_fixes(cues_src):
    fx = json.load(open(f"{DIR}/caption-fixes.json", encoding="utf-8"))
    report = {"applied": [], "not_found": []}
    timed = [f for f in fx["replacements"] if f.get("at")]
    glob = [f for f in fx["replacements"] if not f.get("at")]
    for f in timed:
        t = mmss(f["at"])
        pat = norm_pat(f["from"])
        hit = False
        for c in cues_src:
            if abs(c["start"] - t) <= 12 and pat and pat.search(c["text"]):
                c["text"] = pat.sub(f["to"], c["text"])
                hit = True
        (report["applied"] if hit else report["not_found"]).append({"at": f["at"], "from": f["from"], "to": f["to"]})
    for c in cues_src:
        c["text"] = re.sub(r"acapella", "a cappella", c["text"], flags=re.I)
        for pat, to, near in NAMES:  # verified names (sources in caption-fixes.json)
            if near is None or abs(c["start"] - near) <= 15:
                c["text"] = re.sub(pat, to, c["text"], flags=re.I)
        for f in glob:
            c["text"] = re.sub(re.escape(f["from"]), f["to"], c["text"], flags=re.I)
        c["text"] = re.sub(r"\bacapella\b", "a cappella", c["text"], flags=re.I)
        c["text"] = re.sub(r"\bi\b", "I", c["text"])
        c["text"] = c["text"].replace("\u2014", ", ")
    return report


# (regex, replacement, source-second or None for everywhere). Verified in caption-fixes.json.
NAMES = [
    (r"(\w) -(\w)", r"\1-\2", None),                     # Whisper's "doo -wop" token split
    (r"\bnon-plus\b", "nonplussed", None),
    (r"\bGene Perling\b", "Gene Puerling", None),
    (r"\bhigh lows\b", "Hi-Lo's", None),
    (r"\bfour aces\b", "Four Aces", None),
    (r"\bfour preps\b", "Four Preps", None),
    (r"\bmills brothers\b", "Mills Brothers", None),
    (r"\bforever plaid\b", "Forever Plaid", None),
    (r"\bwhiff and poops\b", "Whiffenpoofs", None),
    (r"\bcrosby,? stills,? and nash\b", "Crosby, Stills and Nash", None),
    (r"\bforward man\b", "Ford man", None),
    (r"\bby roach\b", "by rote", None),
    (r"\bquarterdotes\b", "quarter notes", None),
    (r"\bsweet (?:outlines|eyed lines)\b", "Sweet Adelines", None),
    (r"\bsing united\b", "SingUnited", None),
    (r"\bchapel roan\b", "Chappell Roan", None),
    (r"\bbilly eilish\b", "Billie Eilish", None),
    (r"\bneil sadaka\b", "Neil Sedaka", None),
    (r"\bcivetans\b", "Civitans", None),
    (r"\bstartville\b", "Starkville", None),
    (r"\bhoopty[- ]?doo?\b", "Hoop-Dee-Doo", None),
    (r"\bbeer barrel polka\b", "Beer Barrel Polka", None),
    (r"\broll out the barrel\b", "Roll Out the Barrel", None),
    (r"\bmarble shop\b", "barbershop", None),
    (r"\bself-fulfilling privacy\b", "self-fulfilling prophecy", None),
    (r"\bfind the cord\b", "find the chord", None),
    (r"\bsecondary dominance\b", "secondary dominants", None),
    (r"\bsweet honey (?:and|in) the rock\b", "Sweet Honey in the Rock", None),
    (r"\bking'?s? singers\b", "King's Singers", None),
    (r"\bthe persuasions\b", "the Persuasions", None),
    (r"\bcontemporary a ?cappella society of america\b", "Contemporary A Cappella Society of America", None),
    (r"\balt\.? music\.? a ?cappella\b", "alt.music.a-cappella", None),
    (r"\brec\.? music\.? a ?cappella\b", "rec.music.a-cappella", None),
    (r"\bsan francisco gay men'?s chorus\b", "San Francisco Gay Men's Chorus", None),
    (r"\bbarberpole cat\b", "Barberpole Cat", None),
    (r"\beveryone in harmony\b", "Everyone in Harmony", None),
    (r"\bgreat american songbook\b", "Great American Songbook", None),
    (r"\btin pan alley\b", "Tin Pan Alley", None),
    (r"\bNew Mexico,?( and some of them)", r"New MexiChord,\1", 1069),
    (r"\bwant to integrate\b", "want to denigrate", 2161),
]


def srt_time(s):
    ms = int(round(s * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def premerge(words):
    """Fix names Whisper split into several tokens, before cues are cut (a cue break could separate them).
    Also turn 'acapella' into 'a cappella' here so cue lengths are measured on the final text."""
    out, i = [], 0
    low = lambda k: words[k]["word"].lower().strip(",.?!") if k < len(words) else ""
    while i < len(words):
        w = dict(words[i])
        if low(i).startswith("whiff") and low(i + 1) == "and" and low(i + 2).startswith("poops"):
            tail = words[i + 2]["word"][len(words[i + 2]["word"].rstrip(",.?!")):]
            w.update(word="Whiffenpoofs" + tail, end=words[i + 2]["end"]); out.append(w); i += 3; continue
        if i + 1 < len(words) and re.fullmatch(r"\d+", words[i]["word"]) and re.match(r",\d{3}", words[i + 1]["word"]):
            w.update(word=words[i]["word"] + words[i + 1]["word"], end=words[i + 1]["end"]); out.append(w); i += 2; continue
        if low(i) == "chapel" and low(i + 1).startswith("roan"):
            w["word"] = "Chappell"
        w["word"] = re.sub(r"(?i)\bacapella\b", "a cappella", w["word"])
        out.append(w); i += 1
    return out


def fits(text):
    w = wrap(text)
    lines = w.splitlines()
    return len(lines) <= 2 and all(len(l) <= MAXC for l in lines)


def split_long(cues):
    """Any cue that cannot be shown as at most two lines of 42 characters is split, time shared by length."""
    out, todo = [], list(cues)
    while todo:
        c = todo.pop(0)
        if fits(c["text"]):
            out.append(c); continue
        ws = c["text"].split()
        k = len(ws) // 2
        a, b = " ".join(ws[:k]), " ".join(ws[k:])
        mid = c["start"] + (c["end"] - c["start"]) * len(a) / max(1, len(a) + len(b))
        todo[:0] = [dict(c, end=mid - 0.02, text=a), dict(c, start=mid, text=b)]
    return out


def main():
    plan = json.load(open(f"{DIR}/edit/plan.json"))
    main_words = json.load(open(f"{DIR}/main-words.json", encoding="utf-8"))["words"]
    # Source-time cues for the conversation; fixes are keyed to source time.
    m0, m1 = plan["main"][0]["src"][0], plan["main"][-1]["src"][1]
    words = premerge([w for w in main_words if m0 <= w["start"] < m1])
    src_cues = cues_from(words)
    report = apply_fixes(src_cues)
    src_cues = split_long(src_cues)
    out = []
    shift = plan["main"][0]["at"] - fr(m0)
    for c in src_cues:
        out.append({"start": c["start"] + shift, "end": min(c["end"], m1) + shift, "text": c["text"]})
    # Cold open: Bill's three clips, exact clean wording (verified by re-transcribing each clip).
    cold_text = [
        "The war that I have seen, that seems to me a war between harmony and rhythm, that barbershop has been fighting since day one.",
        "I have often said that when I joined the Society, they were singing songs I didn't know, and now they're singing songs I don't know again.",
        "My pep talk to the chorus before our performance was, you know, don't worry about how well you sing, just show them how much fun it is to be a New MexiChord, and some of them will want to be a part of that.",
    ]
    cold = []
    for c, text in zip(plan["cold"], cold_text):
        dur = c["src"][1] - c["src"][0]
        parts, cur = [], ""
        for w in text.split():  # split each clip's sentence into readable cues across its length
            if len(cur + " " + w) > MAXC * MAXL - 10:
                parts.append(cur.strip()); cur = ""
            cur += " " + w
        parts.append(cur.strip())
        total = sum(len(p) for p in parts)
        t = c["at"] + 0.2
        for p in parts:
            d = (dur - 0.4) * len(p) / total
            cold.append({"start": t, "end": t + d - 0.04, "text": p}); t += d
    allc = cold + out
    with open(f"{DIR}/edit/bill-biffle-deke.en.srt", "w", encoding="utf-8") as f:
        for i, c in enumerate(allc, 1):
            f.write(f"{i}\n{srt_time(c['start'])} --> {srt_time(c['end'])}\n{wrap(c['text'])}\n\n")
    report["cues"] = len(allc)
    json.dump(report, open(f"{DIR}/edit/caption-report.json", "w"), indent=1)
    print(f"{len(allc)} cues; fixes applied {len(report['applied'])}, not found {len(report['not_found'])}")
    for nf in report["not_found"]:
        print("  not found:", nf)


if __name__ == "__main__":
    main()
