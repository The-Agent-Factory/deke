# Give the "go" for one planned week: schedules it in Postiz.
# Usage:  engine\approve.ps1 2026-11-02
param([Parameter(Mandatory = $true)][string]$Week)
$py = (Get-Command python).Source
& $py -X utf8 "$PSScriptRoot\batch.py" publish $Week
exit $LASTEXITCODE
