# Run once (right-click > Run with PowerShell). Safe to run again: it replaces the tasks.
#
# Weekly rhythm (Denis, 2026-10-31):
#   Deke Engine Weekly    Saturday 7:00 AM  build next week's posts, email Deke the review link
#   Deke Engine Review    9:00 AM and 9:00 PM daily  remind Deke Sunday morning; schedule his week once he
#                         answers, or Sunday 9 PM if he has not (no answer = everything posts)
#   Deke Engine Watchdog  8:30 AM daily     health check, emails Denis only when something is red
# All three catch up if the laptop was asleep or off.
#
# It also copies ENGINE_REVIEW_SECRET from deke\.env to the dekesharon.com service on Railway
# (never printed), so the engine can post the plan to Deke's review page.

$py  = "C:\Python313\python.exe"
$dir = "C:\Users\lafla\claude_projects\deke\engine"
$set = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 6)

$weekly   = New-ScheduledTaskAction -Execute $py -Argument "-X utf8 `"$dir\weekly.py`""       -WorkingDirectory $dir
$review   = New-ScheduledTaskAction -Execute $py -Argument "-X utf8 `"$dir\review.py`" tick" -WorkingDirectory $dir
$watchdog = New-ScheduledTaskAction -Execute $py -Argument "-X utf8 `"$dir\watchdog.py`""     -WorkingDirectory $dir

Register-ScheduledTask -TaskName "Deke Engine Weekly" -Action $weekly -Trigger (New-ScheduledTaskTrigger -Weekly -DaysOfWeek Saturday -At 7:00am) -Settings $set -Description "Deke content engine: build next week, send to Deke for review (engine/weekly.py)" -Force | Out-Null
Register-ScheduledTask -TaskName "Deke Engine Review" -Action $review -Trigger @((New-ScheduledTaskTrigger -Daily -At 9:00am), (New-ScheduledTaskTrigger -Daily -At 9:00pm)) -Settings $set -Description "Deke content engine: remind Deke, then schedule his approved week (engine/review.py tick)" -Force | Out-Null
Register-ScheduledTask -TaskName "Deke Engine Watchdog" -Action $watchdog -Trigger (New-ScheduledTaskTrigger -Daily -At 8:30am) -Settings $set -Description "Deke content engine daily health check (engine/watchdog.py)" -Force | Out-Null

Get-ScheduledTask | Where-Object TaskName -like "Deke Engine*" | ForEach-Object {
  "{0} | {1} | next run {2}" -f $_.TaskName, $_.State, ($_ | Get-ScheduledTaskInfo).NextRunTime
}

# Railway secret for the review page
$line = Select-String -Path "C:\Users\lafla\claude_projects\deke\.env" -Pattern '^ENGINE_REVIEW_SECRET=' | Select-Object -First 1
if (-not $line) {
  Write-Host "ENGINE_REVIEW_SECRET is missing from deke\.env. Ask Claude to create it."
} else {
  Set-Location "C:\Users\lafla\claude_projects\deke"
  railway variables --service deke --set ("ENGINE_REVIEW_SECRET=" + $line.Line.Substring(21)) | Out-Null
  if ($LASTEXITCODE -eq 0) { Write-Host "Railway secret set. dekesharon.com redeploys in about 3 minutes." }
  else { Write-Host "Railway refused the secret. Run 'railway login', then run this script again." }
}
Read-Host "Done. Press Enter to close"
