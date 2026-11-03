"""Read Deke's shared Dropbox footage online, without copying files to any drive.

rclone serves the shared folder "TotalVocal Skool" over a local HTTP port with no file cache;
ffmpeg and Whisper read from those URLs and pull only the bytes they need (a 6 s cut from the
middle of a 2.9 GB clip moved 31 MB in 11 s, test 2026-11-03).

    from dropbox_stream import served, url, key
    with served():
        ffmpeg -ss 254 -i url("China/DJI_..._0056_D.MP4") ...
"""
import contextlib, os, re, subprocess, time, urllib.parse, urllib.request

RCLONE = os.environ.get("RCLONE_EXE") or os.path.join(
    os.path.expanduser("~"), "AppData", "Local", "Microsoft", "WinGet", "Packages",
    "Rclone.Rclone_Microsoft.Winget.Source_8wekyb3d8bbwe", "rclone-v1.74.4-windows-amd64", "rclone.exe")
REMOTE = "dropbox:TotalVocal Skool"
PORT = int(os.environ.get("DEKE_DBX_PORT", "8765"))
BASE = f"http://127.0.0.1:{PORT}/"
VIDEO_EXT = {".mp4", ".mov", ".m4v", ".mkv", ".webm"}
# Not trip footage: our own old pull copies (deke-media) and our renders (card68 masters).
EXCLUDE_TOP = {"deke-media", "Deke card68 masters"}


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
    if not os.path.exists(RCLONE):
        raise SystemExit(f"rclone not found at {RCLONE}")
    flags = 0x08000000 if os.name == "nt" else 0  # CREATE_NO_WINDOW
    proc = subprocess.Popen([RCLONE, "serve", "http", REMOTE, "--addr", f"127.0.0.1:{PORT}", "--read-only",
                             "--vfs-cache-mode", "off"], stdout=subprocess.DEVNULL, stderr=subprocess.PIPE,
                            creationflags=flags)
    for _ in range(60):
        if _up():
            break
        if proc.poll() is not None:
            raise SystemExit(f"rclone serve exited {proc.returncode}: {proc.stderr.read().decode(errors='replace')[-800:]}")
        time.sleep(0.5)
    else:
        proc.kill()
        raise SystemExit("rclone serve did not come up within 30 s")
    try:
        yield
    finally:
        proc.terminate()
        try:
            proc.wait(10)
        except subprocess.TimeoutExpired:
            proc.kill()


def url(rel):
    """HTTP URL for a path relative to TotalVocal Skool, e.g. 'China/DJI_..._0056_D.MP4'."""
    return BASE + urllib.parse.quote(rel.replace("\\", "/"))


def key(rel):
    """Stable transcript key for a Dropbox clip (folder + file name, safe characters only)."""
    return "dbx_" + re.sub(r"[^A-Za-z0-9]+", "_", os.path.splitext(rel)[0]).strip("_")


def list_remote():
    """Every file in the shared folder: [{Path, Name, Size, ModTime}, ...]."""
    import json
    r = subprocess.run([RCLONE, "lsjson", REMOTE, "--recursive", "--files-only"], capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    if r.returncode != 0 or not r.stdout.strip():
        raise SystemExit(f"rclone lsjson failed (exit {r.returncode}): {(r.stderr or '')[-800:]}")
    return json.loads(r.stdout)


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
