"""Shared helpers for the Deke content engine: config, bank, Postiz reads, Resend email."""
import json, os, shutil, datetime, urllib.request, urllib.error
from zoneinfo import ZoneInfo

ENGINE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(ENGINE)
STATE = os.path.join(ENGINE, "state")
BATCHES = os.path.join(ENGINE, "batches")
os.makedirs(STATE, exist_ok=True)
os.makedirs(BATCHES, exist_ok=True)


def safe_write_json(p, data):
    """Write JSON so a power cut can never leave a blank file: write tmp, fsync, keep .bak, then swap."""
    tmp = p + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=1, ensure_ascii=False, default=str)
        f.flush()
        os.fsync(f.fileno())
    json.load(open(tmp, encoding="utf-8"))  # refuse to swap in something unreadable
    if os.path.exists(p) and os.path.getsize(p) > 0:
        try:
            json.load(open(p, encoding="utf-8"))
            shutil.copyfile(p, p + ".bak")
        except ValueError:
            pass  # current file is already bad; keep the older .bak
    os.replace(tmp, p)


def load_json_safe(p):
    """Read JSON, falling back to the .bak copy if the main file is damaged."""
    try:
        return json.load(open(p, encoding="utf-8"))
    except ValueError:
        return json.load(open(p + ".bak", encoding="utf-8"))


def load_env():
    env = {}
    for p in (os.path.join(REPO, ".env"), os.path.join(REPO, "..", "postiz", ".env")):
        if os.path.exists(p):
            for line in open(p, encoding="utf-8", errors="replace"):
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    env.setdefault(k.strip(), v.strip().strip('"').strip("'"))
    return env


ENV = load_env()
CONFIG = json.load(open(os.path.join(ENGINE, "config.json"), encoding="utf-8"))
TZ = ZoneInfo(CONFIG["timezone"])


def now():
    return datetime.datetime.now(TZ)


def load_bank():
    return load_json_safe(os.path.join(ENGINE, "bank.json"))


def save_bank(bank):
    safe_write_json(os.path.join(ENGINE, "bank.json"), bank)


def postiz(path):
    url = ENV.get("POSTIZ_API_URL", "https://api.postiz.com/public/v1") + path
    req = urllib.request.Request(url, headers={"Authorization": ENV["POSTIZ_API_KEY"], "User-Agent": "deke-content-engine/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


def deke_integrations():
    return {i["id"]: i for i in postiz("/integrations") if i["id"] in CONFIG["postiz_channels"].values()}


def deke_posts(days_back=1, days_ahead=60):
    start = (datetime.datetime.utcnow() - datetime.timedelta(days=days_back)).strftime("%Y-%m-%dT%H:%M:%SZ")
    end = (datetime.datetime.utcnow() + datetime.timedelta(days=days_ahead)).strftime("%Y-%m-%dT%H:%M:%SZ")
    posts = postiz(f"/posts?startDate={start}&endDate={end}")
    posts = posts.get("posts", posts) if isinstance(posts, dict) else posts
    ids = set(CONFIG["postiz_channels"].values())
    return [p for p in posts if (p.get("integration") or {}).get("id") in ids and not p.get("deletedAt")]


def send_email(subject, html, to=None, reply_to=None, bcc=None, sender=None):
    key = ENV.get("RESEND_API_KEY")
    if not key:
        raise RuntimeError("RESEND_API_KEY missing from deke/.env, cannot email Denis")
    msg = {"from": sender or CONFIG["email_from"], "to": [to or CONFIG["alert_email"]], "subject": subject, "html": html}
    if reply_to:
        msg["reply_to"] = reply_to
    if bcc:
        msg["bcc"] = [bcc]
    body = json.dumps(msg).encode("utf-8")
    req = urllib.request.Request("https://api.resend.com/emails", data=body, method="POST",
                                 headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json",
                                          "User-Agent": "deke-content-engine/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"Resend {e.code}: {e.read().decode('utf-8', 'replace')[:500]}")


def write_state(name, data):
    safe_write_json(os.path.join(STATE, name), data)


def read_state(name, default=None):
    p = os.path.join(STATE, name)
    return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else default


def site_api(method, path, body=None):
    """Call dekesharon.com's content-review API with the engine secret."""
    secret = ENV.get("ENGINE_REVIEW_SECRET")
    if not secret:
        raise RuntimeError("ENGINE_REVIEW_SECRET missing from deke/.env")
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(CONFIG["review_site"] + path, data=data, method=method,
                                 headers={"Authorization": f"Bearer {secret}", "Content-Type": "application/json",
                                          "User-Agent": "deke-content-engine/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"site {method} {path} -> {e.code}: {e.read().decode('utf-8', 'replace')[:400]}")


def postiz_upload(path):
    """Upload a file to Postiz media; returns its public URL (used for Deke's preview page)."""
    import uuid, mimetypes
    boundary = uuid.uuid4().hex
    name = os.path.basename(path)
    ctype = mimetypes.guess_type(name)[0] or "application/octet-stream"
    crlf = chr(13) + chr(10)
    head = (f"--{boundary}{crlf}Content-Disposition: form-data; name=\"file\"; filename=\"{name}\"{crlf}"
            f"Content-Type: {ctype}{crlf}{crlf}").encode("utf-8")
    data = head + open(path, "rb").read() + f"{crlf}--{boundary}--{crlf}".encode("utf-8")
    url = ENV.get("POSTIZ_API_URL", "https://api.postiz.com/public/v1") + "/upload"
    req = urllib.request.Request(url, data=data, method="POST",
                                 headers={"Authorization": ENV["POSTIZ_API_KEY"], "User-Agent": "deke-content-engine/1.0",
                                          "Content-Type": f"multipart/form-data; boundary={boundary}"})
    with urllib.request.urlopen(req, timeout=300) as r:
        out = json.loads(r.read().decode("utf-8"))
    if not out.get("path"):
        raise RuntimeError(f"Postiz upload of {name} returned no path: {str(out)[:300]}")
    return out["path"]
