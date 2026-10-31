# Dry run of the weekly Deke loop, one step at a time (right-click > Run with PowerShell).
# Nothing reaches Deke and nothing is scheduled in Postiz. Every email comes to Denis marked [DRY RUN].
# Before each step you can press Enter to run it, S to skip it, or Q to stop.
$py  = "C:\Python313\python.exe"
$dir = "C:\Users\lafla\claude_projects\deke\engine"
Set-Location "C:\Users\lafla\claude_projects\deke"
$steps = @(
  "Fresh dry workspace (copy of the clip bank)",
  "Preflight: drive, keys, tools, Postiz, website",
  "Find Deke's videos on YouTube (read-only)",
  "Quality gate: a bad clip must be rejected",
  "Render one reel",
  "Build next week, Postiz dry run, email you the review link",
  "Deke's answer: open the link in your email and tap Approve or Skip (or type A here to simulate approve-all)",
  "Sunday reminder email (to you)",
  "Sunday-night scheduling, dry: what WOULD post, emailed to you",
  "Monday catch-up email (to you)",
  "Proof: no new Deke posts in Postiz, no email to Deke"
)
for ($i = 0; $i -lt $steps.Count; $i++) {
  Write-Host ""
  Write-Host ("Step {0}: {1}" -f $i, $steps[$i]) -ForegroundColor Yellow
  $k = Read-Host "Enter = run, S = skip, Q = quit"
  if ($k -match '^[Qq]') { break }
  if ($k -match '^[Ss]') { continue }
  if ($i -eq 6 -and $k -match '^[Aa]') { & $py -X utf8 "$dir\dryrun.py" step 6 --answer approve-all }
  else { & $py -X utf8 "$dir\dryrun.py" step $i }
  if ($LASTEXITCODE -ne 0) { Write-Host "This step did not pass. Read the line above; you can run it again or quit." -ForegroundColor Red }
}
Read-Host "Finished. Press Enter to close"
