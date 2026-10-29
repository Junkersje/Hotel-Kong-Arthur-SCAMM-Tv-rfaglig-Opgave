<#
.SYNOPSIS
    Opdaterer alle 54 Jira tasks i scam-hotelKing (SH) med fyldestgorende beskrivelser (Formaal, Handlinger, DoD).
.DESCRIPTION
    Scriptet indlaeser Jira login fra .env, laeser data fra scripts/tasks-detailed.json,
    opbygger Atlassian Document Format (ADF) for hver task og sender en PUT anmodning til Jira REST API.
#>

$envFile = Join-Path $PSScriptRoot "..\.env"
if (-not (Test-Path $envFile)) {
    Write-Error "Kunne ikke finde .env filen i roden."
    exit 1
}

$envVars = @{}
Get-Content $envFile | Where-Object { $_ -match '^\s*([A-Za-z_]+)\s*=\s*(.*)$' } | ForEach-Object {
    $envVars[$matches[1].Trim()] = $matches[2].Trim()
}

$jiraHost = if ($envVars['JIRA_HOST']) { $envVars['JIRA_HOST'] } else { $envVars['JIRA_BASE_URL'] }
if ($jiraHost -match '^(https?://[^/]+)') {
    $jiraHost = $matches[1]
}
$jiraEmail = $envVars['JIRA_EMAIL']
$jiraToken = $envVars['JIRA_API_TOKEN']
$projectKey = if ($envVars['JIRA_PROJECT_KEY']) { $envVars['JIRA_PROJECT_KEY'] } else { "SH" }

$base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${jiraEmail}:${jiraToken}"))
$headers = @{
    "Authorization" = "Basic $base64Auth"
    "Content-Type"  = "application/json; charset=utf-8"
    "Accept"        = "application/json"
}

# Verificer forbindelse
try {
    $me = Invoke-RestMethod -Uri "$jiraHost/rest/api/3/myself" -Headers $headers -Method Get
    Write-Host "Forbundet til Jira som: $($me.displayName) ($($me.emailAddress))" -ForegroundColor Green
} catch {
    Write-Error "Kunne ikke forbinde til Jira. Tjek .env. Fejl: $_"
    exit 1
}

$jsonPath = Join-Path $PSScriptRoot "tasks-detailed.json"
if (-not (Test-Path $jsonPath)) {
    Write-Error "Kunne ikke finde tasks-detailed.json i $jsonPath"
    exit 1
}

$jsonRaw = [System.IO.File]::ReadAllText($jsonPath, [System.Text.Encoding]::UTF8)
$tasks = $jsonRaw | ConvertFrom-Json

Write-Host "Fandt $($tasks.Count) detaljerede tasks. Starter opdatering af beskrivelser i Jira projekt '$projectKey'..." -ForegroundColor Cyan

$successCount = 0
$failCount = 0

foreach ($t in $tasks) {
    $issueKey = $t.issueKey
    $taskId = $t.taskId

    # Opbyg bullet items for handlinger
    $bulletItems = @()
    foreach ($act in $t.actions) {
        $bulletItems += @{
            type = "listItem"
            content = @(
                @{
                    type = "paragraph"
                    content = @(
                        @{
                            type = "text"
                            text = [string]$act
                        }
                    )
                }
            )
        }
    }

    $adfDesc = @{
        type = "doc"
        version = 1
        content = @(
            @{
                type = "heading"
                attrs = @{ level = 3 }
                content = @(@{ type = "text"; text = "Formål (Hvad opgaven gør og hvorfor):" })
            },
            @{
                type = "paragraph"
                content = @(@{ type = "text"; text = [string]$t.purpose })
            },
            @{
                type = "heading"
                attrs = @{ level = 3 }
                content = @(@{ type = "text"; text = "Hvad der skal gøres (Trin-for-trin handlinger):" })
            },
            @{
                type = "bulletList"
                content = $bulletItems
            },
            @{
                type = "heading"
                attrs = @{ level = 3 }
                content = @(@{ type = "text"; text = "Acceptkriterier / Definition of Done:" })
            },
            @{
                type = "paragraph"
                content = @(@{ type = "text"; text = [string]$t.dod })
            }
        )
    }

    $payloadObj = @{
        fields = @{
            description = $adfDesc
        }
    }

    $payloadJson = $payloadObj | ConvertTo-Json -Depth 10
    $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($payloadJson)

    try {
        $res = Invoke-RestMethod -Uri "$jiraHost/rest/api/3/issue/$issueKey" -Headers $headers -Method Put -Body $bodyBytes
        $successCount++
        Write-Host "[$successCount/$($tasks.Count)] Opdateret: $issueKey ($taskId - $($t.title))" -ForegroundColor Green
    } catch {
        $failCount++
        Write-Warning "Fejl ved opdatering af $issueKey ($taskId): $_"
    }
}

Write-Host "Færdig! Opdaterede $successCount tasks med fyldestgørende beskrivelser ($failCount fejl)." -ForegroundColor Green
