<#
.SYNOPSIS
    Importerer alle tasks fra specs/001-hotel-management/tasks.md direkte til et Jira Cloud Kanban board via REST API.
.DESCRIPTION
    Scriptet indlæser JIRA_HOST, JIRA_EMAIL, JIRA_API_TOKEN og JIRA_PROJECT_KEY fra .env,
    parser de 54 tasks og opretter dem som standard Task issues i Jira.
#>

$envFile = Join-Path $PSScriptRoot "..\.env"
if (-not (Test-Path $envFile)) {
    Write-Error "Kunne ikke finde .env filen i roden. Opret venligst .env med dine Jira API oplysninger."
    exit 1
}

# Indlæs .env variabler
$envVars = @{}
Get-Content $envFile | Where-Object { $_ -match '^\s*([A-Za-z_]+)\s*=\s*(.*)\s*$' } | ForEach-Object {
    $key = $matches[1].Trim()
    $val = $matches[2].Trim()
    $envVars[$key] = $val
}

$jiraHost = if ($envVars['JIRA_HOST']) { $envVars['JIRA_HOST'] } else { $envVars['JIRA_BASE_URL'] }
if ($jiraHost -match '^(https?://[^/]+)') {
    $jiraHost = $matches[1]
}
$jiraEmail = $envVars['JIRA_EMAIL']
$jiraToken = $envVars['JIRA_API_TOKEN']
$projectKey = if ($envVars['JIRA_PROJECT_KEY']) { $envVars['JIRA_PROJECT_KEY'] } else { "SH" }

if (-not $jiraHost -or $jiraHost -match 'your-domain' -or -not $jiraToken -or $jiraToken -match 'your_jira_api_token') {
    Write-Warning "Udfyld venligst dine faktiske Jira oplysninger i .env filen:"
    Write-Host "  JIRA_HOST        = $jiraHost"
    Write-Host "  JIRA_EMAIL       = $jiraEmail"
    Write-Host "  JIRA_API_TOKEN   = (indsæt dit token)"
    Write-Host "  JIRA_PROJECT_KEY = $projectKey"
    exit 0
}

# Basis Auth Header
$base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${jiraEmail}:${jiraToken}"))
$headers = @{
    "Authorization" = "Basic $base64Auth"
    "Content-Type"  = "application/json"
    "Accept"        = "application/json"
}

# Tjek forbindelse til Jira og find projekt
$mySelfUrl = "$jiraHost/rest/api/3/myself"
try {
    $me = Invoke-RestMethod -Uri $mySelfUrl -Headers $headers -Method Get
    Write-Host "Forbundet til Jira som: $($me.displayName) ($($me.emailAddress))" -ForegroundColor Green
} catch {
    Write-Error "Kunne ikke forbinde til Jira. Tjek venligst JIRA_HOST, JIRA_EMAIL og JIRA_API_TOKEN. Fejl: $_"
    exit 1
}

# Verificer at projektet findes og tjek dets navn
try {
    $projInfo = Invoke-RestMethod -Uri "$jiraHost/rest/api/3/project/$projectKey" -Headers $headers -Method Get
    Write-Host "Fandt Jira projekt: '$($projInfo.name)' (Key: $($projInfo.key))" -ForegroundColor Green
    if ($projInfo.name -notmatch 'scam-hotelKing') {
        Write-Warning "Bemærk: Projektets navn er '$($projInfo.name)', forventede 'scam-hotelKing'."
    }
    
    # Find passende issue type (f.eks. Task)
    $issueTypes = $projInfo.issueTypes
    $taskType = $issueTypes | Where-Object { $_.name -eq 'Task' } | Select-Object -First 1
    if (-not $taskType) {
        $taskType = $issueTypes | Where-Object { -not $_.subtask } | Select-Object -First 1
    }
    $selectedIssueTypeName = if ($taskType) { $taskType.name } else { "Task" }
    Write-Host "Bruger Issue Type: '$selectedIssueTypeName'" -ForegroundColor Cyan
} catch {
    Write-Error "Kunne ikke hente information om projekt '$projectKey'. Fejl: $_"
    exit 1
}

# Indlæs tasks.md
$tasksFile = Join-Path $PSScriptRoot "..\specs\001-hotel-management\tasks.md"
if (-not (Test-Path $tasksFile)) {
    Write-Error "Kunne ikke finde $tasksFile"
    exit 1
}

$taskLines = Get-Content $tasksFile | Where-Object { $_ -match '^- \[ \]\s+(T\d+)\s+(.*)$' }
Write-Host "Fandt $($taskLines.Count) tasks i tasks.md. Starter oprettelse i Jira projekt '$projectKey' ($($projInfo.name))..." -ForegroundColor Cyan

$count = 0
foreach ($line in $taskLines) {
    if ($line -match '^- \[ \]\s+(T\d+)\s+(\[P\]\s+)?(\[US\d+\]\s+)?(.*)$') {
        $taskId = $matches[1]
        $isParallel = [bool]$matches[2]
        $storyTag = if ($matches[3]) { $matches[3].Trim() } else { "" }
        $description = $matches[4].Trim()

        $tagPart = if ($storyTag) { "$storyTag " } else { "" }
        $summary = "${taskId}: ${tagPart}${description}"
        if ($summary.Length -gt 250) {
            $summary = $summary.Substring(0, 247) + "..."
        }

        $labels = @("spec-kit", "hotel-kong-arthur")
        if ($isParallel) { $labels += "parallel" }
        if ($storyTag) { $labels += ($storyTag -replace '[\[\]]', '').ToLower() }

        $payloadObj = @{
            fields = @{
                project = @{ key = $projectKey }
                summary = $summary
                description = @{
                    type = "doc"
                    version = 1
                    content = @(
                        @{
                            type = "paragraph"
                            content = @(
                                @{
                                    type = "text"
                                    text = "Task ID: $taskId`nDetaljer: $description`nOprettet via GitHub Spec Kit plan."
                                }
                            )
                        }
                    )
                }
                issuetype = @{ name = $selectedIssueTypeName }
                labels = $labels
            }
        }
        $payloadJson = $payloadObj | ConvertTo-Json -Depth 10
        $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($payloadJson)

        try {
            $postHeaders = @{
                "Authorization" = "Basic $base64Auth"
                "Content-Type"  = "application/json; charset=utf-8"
                "Accept"        = "application/json"
            }
            $issueRes = Invoke-RestMethod -Uri "$jiraHost/rest/api/3/issue" -Headers $postHeaders -Method Post -Body $bodyBytes
            $count++
            Write-Host "[$count/$($taskLines.Count)] Oprettet: $($issueRes.key) - $taskId" -ForegroundColor Green
        } catch {
            Write-Warning "Kunne ikke oprette task $taskId. Fejl: $_"
        }
    }
}

Write-Host "Færdig! Oprettede $count opgaver på Jira projekt $projectKey ($($projInfo.name))." -ForegroundColor Green
