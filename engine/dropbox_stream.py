"""Read Deke's shared Dropbox footage online, without copying files to any drive.

Since 2026-11-23 this reads the shared folder "TotalVocal Skool" by its namespace id
(Dropbox-API-Path-Root header): files/list_folder to list, files/get_temporary_link to read.
Denis is a member of the folder but it is NOT added to his Dropbox: it is ~218 GB and his
account has 9.25 GB, so mounting it fails with insufficient_quota (and rclone then reports
"directory not found"). Namespace access uses no Dropbox space and needs no paid plan
(Denis, 2026-11-23: no paying for Dropbox just to reach Deke's files).
Do not use sharing/get_shared_link_file instead: it cannot seek, and reading the end of a
15 GB clip (where the MP4 index sits) timed out after 120 s. Temporary links seek in 0.6 s.

A small local HTTP proxy serves the folder on 127.0.0.1:PORT, forwarding Range requests to
each file's temporary link, so ffmpeg and Whisper pull only the bytes they need.

The Dropbox login is the one rclone already holds (remote "dropbox:"); the token is read at run
time and never printed or written anywhere.

    from dropbox_stream import served, url, key
    with served():
        ffmpeg -ss 254 -i url("China/DJI_..._0056_D.MP4") ...

CLI:  python -X utf8 engine/dropbox_stream.py lsjson ["TotalVocal Skool"]
      prints every file as JSON [{Path, Name, Size, ModTime}] (same shape as rclone lsjson).
"""
import contextlib, http.server, json, os, re, shutil, subprocess, sys, threading, time
import urllib.error, urllib.parse, urllib.request

RCLONE = os.environ.get("RCLONE_EXE") or os.path.join(
    os.path.expanduser("~"), "AppData", "Local", "Microsoft", "WinGet", "Packages",
    "Rclone.Rclone_Microsoft.Winget.Source_8wekyb3d8bbwe", "rclone-v1.74.4-windows-amd64", "rclone.exe")
RCLONE_REMOTE = "dropbox"
FOLDER = "TotalVocal Skool"
REMOTE = f"{RCLONE_REMOTE}:{FOLDER}"  # kept for callers that print it
PORT = int(os.environ.get("DEKE_DBX_PORT", "8765"))
BASE = f"http://127.0.0.1:{PORT}/"
VIDEO_EXT = {".mp4", ".mov", ".m4v", ".mkv", ".webm"}
# Not trip footage: our own old pull copies (deke-media) and our renders (card68 masters).
EXCLUDE_TOP = {"deke-media", "Deke card68 masters"}

_lock = threading.Lock()
_state = {"token": None, "ns": {}, "temp": {}}


# ---------- Dropbox API ----------

def _token(refresh=False):
    with _lock:
        if refresh or not _state["token"]:
            if not os.path.exists(RCLONE):
                raise SystemExit(f"rclone not found at {RCLONE} (it holds the Dropbox login)")
            # Any rclone call refreshes an expired token and saves it to rclone's config.
            subprocess.run([RCLONE, "about", f"{RCLONE_REMOTE}:"], capture_output=True)
            dump = subprocess.run([RCLONE, "config", "dump"], capture_output=True, text=True)
            try:
                _state["token"] = json.loads(json.loads(dump.stdout)[RCLONE_REMOTE]["token"])["access_token"]
            except Exception as e:
                raise SystemExit(f"cannot read the Dropbox login from rclone remote '{RCLONE_REMOTE}': {type(e).__name__}")
        return _state["token"]


def _ns(folder=FOLDER):
    """Namespace id of a shared folder Denis is a member of (mounted or not)."""
    if folder in _state["ns"]:
        return _state["ns"][folder]
    d = _api("sharing/list_folders", {"limit": 1000}, ns=None)
    entries = d["entries"]
    while d.get("cursor"):
        d = _api("sharing/list_folders/continue", {"cursor": d["cursor"]}, ns=None)
        entries += d["entries"]
    hit = [e for e in entries if e["name"] == folder]
    if not hit:
        raise SystemExit(f"shared folder '{folder}' not found in Denis's Dropbox shares "
                         f"({len(entries)} shares listed). Was Denis removed from it?")
    _state["ns"][folder] = hit[0]["shared_folder_id"]
    return _state["ns"][folder]


def _api(endpoint, arg, ns=FOLDER):
    """Dropbox RPC call. With ns (a folder name), paths are relative to that shared folder's
    namespace (Dropbox-API-Path-Root), which works even when the folder is not in Denis's Dropbox.
    Retries once with a fresh token on 401."""
    root = None if ns is None else _ns(ns)
    for attempt in (0, 1):
        h = {"Authorization": "Bearer " + _token(refresh=attempt == 1), "Content-Type": "application/json"}
        if root:
            h["Dropbox-API-Path-Root"] = json.dumps({".tag": "namespace_id", "namespace_id": root})
        req = urllib.request.Request("https://api.dropboxapi.com/2/" + endpoint, data=json.dumps(arg).encode(), headers=h)
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            if e.code == 401 and attempt == 0:
                continue
            raise SystemExit(f"Dropbox {endpoint} failed: {e.code} {e.read()[:300]!r}")


def list_remote(folder=FOLDER):
    """Every file in the shared folder: [{Path, Name, Size, ModTime}, ...] (Path relative to the folder)."""
    files = []
    d = _api("files/list_folder", {"path": "", "recursive": True, "limit": 2000}, ns=folder)
    while True:
        for e in d["entries"]:
            if e[".tag"] == "file":
                files.append({"Path": e["path_display"].lstrip("/"), "Name": e["name"], "Size": e.get("size", 0),
                              "ModTime": e.get("client_modified") or e.get("server_modified")})
        if not d.get("has_more"):
            break
        d = _api("files/list_folder/continue", {"cursor": d["cursor"]}, ns=folder)
    return sorted(files, key=lambda f: f["Path"])


def _temp_link(rel, fresh=False):
    """Direct download URL for one file (Dropbox temporary links last 4 h; reuse for 3 h)."""
    hit = _state["temp"].get(rel)
    if fresh or not hit or time.time() - hit[1] > 3 * 3600:
        hit = (_api("files/get_temporary_link", {"path": "/" + rel})["link"], time.time())
        _state["temp"][rel] = hit
    return hit[0]


def _open(rel, headers):
    """GET one file (Range passed through) from its temporary link; refreshes an expired link once."""
    for attempt in (0, 1):
        req = urllib.request.Request(_temp_link(rel, fresh=attempt == 1), headers=headers)
        try:
            return urllib.request.urlopen(req, timeout=120)
        except urllib.error.HTTPError as e:
            if e.code in (403, 404, 410) and attempt == 0:
                continue
            raise


# ---------- local HTTP proxy (Range requests pass straight through) ----------

class _Handler(http.server.BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *a):  # quiet
        pass

    def do_HEAD(self):
        self._serve(head=True)

    def do_GET(self):
        self._serve(head=False)

    def _serve(self, head):
        rel = urllib.parse.unquote(self.path.split("?", 1)[0]).lstrip("/")
        if not rel:
            self._plain(200, b"dropbox_stream ok")
            return
        rng = self.headers.get("Range")
        want = {"Range": "bytes=0-0"} if head else ({"Range": rng} if rng else {})
        try:
            r = _open(rel, want)
        except SystemExit as e:  # get_temporary_link failed (missing file and the like)
            self._plain(404, str(e).encode()[:500])
            return
        except urllib.error.HTTPError as e:
            self._plain(404 if e.code in (404, 409) else e.code, f"dropbox: {e.code} {e.reason}".encode())
            return
        except Exception as e:
            self._plain(502, f"dropbox: {type(e).__name__}: {e}".encode())
            return
        with r:
            if head:
                total = (r.headers.get("Content-Range") or "/0").rsplit("/", 1)[-1]
                self.send_response(200)
                self.send_header("Content-Length", total)
                self.send_header("Accept-Ranges", "bytes")
                self.send_header("Content-Type", "application/octet-stream")
                self.end_headers()
                return
            self.send_response(r.status)
            length, crange = r.headers.get("Content-Length"), r.headers.get("Content-Range")
            m = re.match(r"bytes (\d+)-(\d+)/", crange or "")
            if not length and m:  # Dropbox sends open-ended ranges chunked, without a length
                length = str(int(m.group(2)) - int(m.group(1)) + 1)
            if length:
                self.send_header("Content-Length", length)
            # Always close: on a reusable connection ffmpeg 7 "soft-seeks" by draining the rest of the
            # response (15 GB to reach a clip's index) instead of asking for a new range.
            self.send_header("Connection", "close")
            self.close_connection = True
            if crange:
                self.send_header("Content-Range", crange)
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Content-Type", "application/octet-stream")
            self.end_headers()
            try:
                shutil.copyfileobj(r, self.wfile, 1 << 20)
            except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
                pass  # ffmpeg drops the connection when it seeks; normal

    def _plain(self, code, body):
        self.send_response(code)
        self.send_header("Content-Type", "text/plain")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def _up():
    try:
        with urllib.request.urlopen(BASE, timeout=3) as r:
            return r.status == 200
    except Exception:
        return False


@contextlib.contextmanager
def served():
    """Make sure the Dropbox folder is reachable over HTTP; stop the server afterwards if we started it."""
    if _up():
        yield; return
    _ns()  # fail loudly here, not inside ffmpeg
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), _Handler)
    srv.daemon_threads = True
    t = threading.Thread(target=srv.serve_forever, daemon=True)
    t.start()
    for _ in range(20):
        if _up():
            break
        time.sleep(0.25)
    else:
        srv.shutdown()
        raise SystemExit(f"dropbox_stream proxy did not come up on {BASE}")
    try:
        yield
    finally:
        srv.shutdown()
        srv.server_close()


def url(rel):
    """HTTP URL for a path relative to TotalVocal Skool, e.g. 'China/DJI_..._0056_D.MP4'."""
    return BASE + urllib.parse.quote(rel.replace("\\", "/"))


def key(rel):
    """Stable transcript key for a Dropbox clip (folder + file name, safe characters only)."""
    return "dbx_" + re.sub(r"[^A-Za-z0-9]+", "_", os.path.splitext(rel)[0]).strip("_")


def footage(files):
    """Trip videos only, each with its DJI .LRF preview (same footage, about 10x smaller) when there is one."""
    lrf = {os.path.splitext(f["Path"])[0].lower(): f["Path"] for f in files if f["Name"].lower().endswith(".lrf")}
    out = []
    for f in files:
        if os.path.splitext(f["Name"])[1].lower() not in VIDEO_EXT or f["Path"].split("/")[0] in EXCLUDE_TOP:
            continue
        out.append(dict(path=f["Path"], size=f["Size"], modTime=f["ModTime"],
                        proxy=lrf.get(os.path.splitext(f["Path"])[0].lower())))
    return out


if __name__ == "__main__":
    if len(sys.argv) >= 2 and sys.argv[1] == "lsjson":
        print(json.dumps(list_remote(sys.argv[2] if len(sys.argv) > 2 else FOLDER), ensure_ascii=False))
    else:
        print(__doc__)
