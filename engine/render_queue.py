"""Render every reel in the bank still at status "idea". One failure does not stop the others;
the exit code is 1 if any failed, and the failures are recorded on the items (status render_failed)."""
import json, os, subprocess, sys
ENGINE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ENGINE)
from common import load_bank
bank = load_bank()
todo = [i["id"] for i in bank["items"] if i["lane"] == "reel" and i["status"] == "idea"]
limit = int(sys.argv[1]) if len(sys.argv) > 1 else len(todo)
failed = []
for item_id in todo[:limit]:
    r = subprocess.run([sys.executable, "-X", "utf8", os.path.join(ENGINE, "render.py"), item_id],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    print((r.stdout + r.stderr).strip()[-400:], flush=True)
    if r.returncode != 0:
        failed.append(item_id)
print(f"rendered {len(todo[:limit]) - len(failed)}/{len(todo[:limit])}; failed: {failed}")
sys.exit(1 if failed else 0)
