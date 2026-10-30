<#
.SYNOPSIS
    Tildeler alle 54 Jira tickets til gruppens 5 medlemmer via Jira Cloud REST API.
#>

$envFile = Join-Path $PSScriptRoot "..\.env"
$envVars = @{}
Get-Content $envFile | Where-Object { $_ -match '^\s*([A-Za-z_]+)\s*=\s*(.*)$' } | ForEach-Object {
    $envVars[$matches[1].Trim()] = $matches[2].Trim()
}
$jiraHost = if ($envVars['JIRA_HOST']) { $envVars['JIRA_HOST'] } else { $envVars['JIRA_BASE_URL'] }
if ($jiraHost -match '^(https?://[^/]+)') { $jiraHost = $matches[1] }
$email = $envVars['JIRA_EMAIL']
$token = $envVars['JIRA_API_TOKEN']
$userPass = $email + ":" + $token
$auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($userPass))
$headers = @{
    Authorization = "Basic $auth"
    "Content-Type" = "application/json; charset=utf-8"
    Accept = "application/json"
}

# Jira Account IDs for de 5 medlemmer
$accounts = @{
    "Mathias"     = "70121:e4f41c02-f24d-41ac-b12d-e6105bf5079c"
    "Simon"       = "712020:c96d2858-515e-4469-8b82-91bbee183021"
    "Amira"       = "712020:5f381d48-4cbf-4fbc-a17e-60becc5a279c"
    "Christoffer" = "712020:1d2bf135-98a3-418e-804e-61b5613bb562"
    "Maja"        = "712020:767622c9-5cfe-42a0-9a09-ff1906f94074"
}

# Ticket fordeling
$assignments = @{
    # Medlem 1: Mathias (11 tickets)
    "SH-1"  = "Mathias"
    "SH-2"  = "Mathias"
    "SH-4"  = "Mathias"
    "SH-6"  = "Mathias"
    "SH-9"  = "Mathias"
    "SH-10" = "Mathias"
    "SH-11" = "Mathias"
    "SH-51" = "Mathias"
    "SH-52" = "Mathias"
    "SH-53" = "Mathias"
    "SH-54" = "Mathias"

    # Medlem 2: Simon (10 tickets)
    "SH-7"  = "Simon"
    "SH-8"  = "Simon"
    "SH-33" = "Simon"
    "SH-34" = "Simon"
    "SH-35" = "Simon"
    "SH-36" = "Simon"
    "SH-37" = "Simon"
    "SH-38" = "Simon"
    "SH-41" = "Simon"
    "SH-42" = "Simon"

    # Medlem 3: Amira (9 tickets)
    "SH-12" = "Amira"
    "SH-13" = "Amira"
    "SH-14" = "Amira"
    "SH-15" = "Amira"
    "SH-16" = "Amira"
    "SH-17" = "Amira"
    "SH-18" = "Amira"
    "SH-19" = "Amira"
    "SH-21" = "Amira"

    # Medlem 4: Christoffer (14 tickets)
    "SH-3"  = "Christoffer"
    "SH-5"  = "Christoffer"
    "SH-20" = "Christoffer"
    "SH-22" = "Christoffer"
    "SH-23" = "Christoffer"
    "SH-24" = "Christoffer"
    "SH-25" = "Christoffer"
    "SH-26" = "Christoffer"
    "SH-27" = "Christoffer"
    "SH-28" = "Christoffer"
    "SH-29" = "Christoffer"
    "SH-30" = "Christoffer"
    "SH-31" = "Christoffer"
    "SH-32" = "Christoffer"

    # Medlem 5: Maja (10 tickets)
    "SH-39" = "Maja"
    "SH-40" = "Maja"
    "SH-43" = "Maja"
    "SH-44" = "Maja"
    "SH-45" = "Maja"
    "SH-46" = "Maja"
    "SH-47" = "Maja"
    "SH-48" = "Maja"
    "SH-49" = "Maja"
    "SH-50" = "Maja"
}

Write-Host "Starter tildeling af 54 Jira tickets..."
$successCount = 0
$failCount = 0

foreach ($key in ($assignments.Keys | Sort-Object { [int]($_ -replace '\D') })) {
    $memberName = $assignments[$key]
    $accountId = $accounts[$memberName]

    $body = @{ accountId = $accountId } | ConvertTo-Json

    try {
        Invoke-RestMethod -Uri "$jiraHost/rest/api/3/issue/$key/assignee" -Headers $headers -Method Put -Body $body | Out-Null
        Write-Host "[$key] -> Tildelt til $memberName" -ForegroundColor Green
        $successCount++
    } catch {
        Write-Host "[$key] -> FEJL ved tildeling til ${memberName}: $_" -ForegroundColor Red
        $failCount++
    }
}

Write-Host ""
Write-Host "Færdig! Succes: $successCount, Fejl: $failCount"
