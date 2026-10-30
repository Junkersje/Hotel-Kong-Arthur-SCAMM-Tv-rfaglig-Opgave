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
    Accept = "application/json"
}
$users = Invoke-RestMethod -Uri "$jiraHost/rest/api/3/user/assignable/search?project=SH" -Headers $headers -Method Get
$users | Select-Object accountId, displayName, emailAddress | Format-Table -AutoSize
