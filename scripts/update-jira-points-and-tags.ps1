<#
.SYNOPSIS
    Opdaterer alle 54 Jira tickets med fasemærker (tags) og Fibonacci Story Points (1, 2, 3, 5, 8, 13).
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
$auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${email}:${token}"))
$headers = @{
    Authorization = "Basic $auth"
    "Content-Type" = "application/json; charset=utf-8"
    Accept = "application/json"
}

# Definer Story Points og Fasetags for samtlige 54 tasks
$taskMeta = @{
    # Fase 1: Setup
    "SH-1"  = @{ phase = "fase-1-setup"; points = 1 }
    "SH-2"  = @{ phase = "fase-1-setup"; points = 2 }
    "SH-3"  = @{ phase = "fase-1-setup"; points = 3 }
    "SH-4"  = @{ phase = "fase-1-setup"; points = 2 }
    "SH-5"  = @{ phase = "fase-1-setup"; points = 3 }
    "SH-6"  = @{ phase = "fase-1-setup"; points = 5 }

    # Fase 2: Foundational
    "SH-7"  = @{ phase = "fase-2-foundational"; points = 5 }
    "SH-8"  = @{ phase = "fase-2-foundational"; points = 5 }
    "SH-9"  = @{ phase = "fase-2-foundational"; points = 3 }
    "SH-10" = @{ phase = "fase-2-foundational"; points = 2 }
    "SH-11" = @{ phase = "fase-2-foundational"; points = 2 }
    "SH-12" = @{ phase = "fase-2-foundational"; points = 3 }

    # Fase 3: US1 & US2 Booking CRUD (MVP)
    "SH-13" = @{ phase = "fase-3-booking-mvp"; points = 2 }
    "SH-14" = @{ phase = "fase-3-booking-mvp"; points = 3 }
    "SH-15" = @{ phase = "fase-3-booking-mvp"; points = 2 }
    "SH-16" = @{ phase = "fase-3-booking-mvp"; points = 2 }
    "SH-17" = @{ phase = "fase-3-booking-mvp"; points = 3 }
    "SH-18" = @{ phase = "fase-3-booking-mvp"; points = 5 }
    "SH-19" = @{ phase = "fase-3-booking-mvp"; points = 2 }
    "SH-20" = @{ phase = "fase-3-booking-mvp"; points = 5 }
    "SH-21" = @{ phase = "fase-3-booking-mvp"; points = 5 }
    "SH-22" = @{ phase = "fase-3-booking-mvp"; points = 3 }

    # Fase 4: US3 Booking Rediger
    "SH-23" = @{ phase = "fase-4-booking-edit"; points = 3 }
    "SH-24" = @{ phase = "fase-4-booking-edit"; points = 3 }
    "SH-25" = @{ phase = "fase-4-booking-edit"; points = 2 }
    "SH-26" = @{ phase = "fase-4-booking-edit"; points = 5 }
    "SH-27" = @{ phase = "fase-4-booking-edit"; points = 2 }

    # Fase 5: US4 Booking Slet/Aflys
    "SH-28" = @{ phase = "fase-5-booking-delete"; points = 2 }
    "SH-29" = @{ phase = "fase-5-booking-delete"; points = 2 }
    "SH-30" = @{ phase = "fase-5-booking-delete"; points = 2 }
    "SH-31" = @{ phase = "fase-5-booking-delete"; points = 3 }
    "SH-32" = @{ phase = "fase-5-booking-delete"; points = 2 }

    # Fase 6: US5-8 Omsætning & Belægning
    "SH-33" = @{ phase = "fase-6-revenue-occupancy"; points = 3 }
    "SH-34" = @{ phase = "fase-6-revenue-occupancy"; points = 3 }
    "SH-35" = @{ phase = "fase-6-revenue-occupancy"; points = 5 }
    "SH-36" = @{ phase = "fase-6-revenue-occupancy"; points = 3 }
    "SH-37" = @{ phase = "fase-6-revenue-occupancy"; points = 2 }
    "SH-38" = @{ phase = "fase-6-revenue-occupancy"; points = 3 }

    # Fase 7: US9-16 Lande, Typer & ADR
    "SH-39" = @{ phase = "fase-7-country-rooms-adr"; points = 3 }
    "SH-40" = @{ phase = "fase-7-country-rooms-adr"; points = 5 }
    "SH-41" = @{ phase = "fase-7-country-rooms-adr"; points = 3 }
    "SH-42" = @{ phase = "fase-7-country-rooms-adr"; points = 3 }
    "SH-43" = @{ phase = "fase-7-country-rooms-adr"; points = 3 }
    "SH-44" = @{ phase = "fase-7-country-rooms-adr"; points = 3 }

    # Fase 8: US17-21 Bar & Tilfredshed
    "SH-45" = @{ phase = "fase-8-bar-satisfaction"; points = 3 }
    "SH-46" = @{ phase = "fase-8-bar-satisfaction"; points = 3 }
    "SH-47" = @{ phase = "fase-8-bar-satisfaction"; points = 5 }
    "SH-48" = @{ phase = "fase-8-bar-satisfaction"; points = 2 }
    "SH-49" = @{ phase = "fase-8-bar-satisfaction"; points = 2 }

    # Fase 9: Polish & Tableau
    "SH-50" = @{ phase = "fase-9-polish-tableau"; points = 8 }
    "SH-51" = @{ phase = "fase-9-polish-tableau"; points = 3 }
    "SH-52" = @{ phase = "fase-9-polish-tableau"; points = 2 }
    "SH-53" = @{ phase = "fase-9-polish-tableau"; points = 8 }
    "SH-54" = @{ phase = "fase-9-polish-tableau"; points = 5 }
}

Write-Host "Starter opdatering af 54 Jira tickets med fasetags og Story Points..." -ForegroundColor Cyan

$i = 0
foreach ($key in ($taskMeta.Keys | Sort-Object { [int]($_ -replace 'SH-', '') })) {
    $i++
    $m = $taskMeta[$key]
    $phaseTag = $m.phase
    $pts = $m.points
    $pointsTag = "sp-$pts"

    # Hent eksisterende labels for at bevare dem
    try {
        $existing = Invoke-RestMethod -Uri "$jiraHost/rest/api/3/issue/$key?fields=labels" -Headers $headers -Method Get
        $labels = @($existing.fields.labels)
    } catch {
        $labels = @()
    }

    # Tilføj tags uden dubletter
    $newLabels = $labels + @($phaseTag, $pointsTag) | Select-Object -Unique

    $payload = @{
        fields = @{
            customfield_10016 = $pts
            labels = $newLabels
        }
    } | ConvertTo-Json

    try {
        Invoke-RestMethod -Uri "$jiraHost/rest/api/3/issue/$key" -Headers $headers -Method Put -Body $payload
        Write-Host "[$i/54] $key opdateret: Tag '$phaseTag', Points: $pts ($pointsTag)" -ForegroundColor Green
    } catch {
        Write-Warning "Fejl ved opdatering af ${key}: $_"
    }
}

Write-Host "Færdig med opdatering af alle 54 tickets!" -ForegroundColor Green
