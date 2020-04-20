# .\tools\updateResourceTypes.ps1 | Out-File -FilePath .\src\ShowDocumentation.generated.ts -Encoding ASCII
$providers = Get-AzResourceProvider
Write-Output "// tslint:disable-next-line:export-name"
Write-Output "export const resourceTypes: string[] = "
$array = New-Object System.Collections.ArrayList

foreach ($provider in $providers) {
    $filtered = $provider | Where-Object { $_.Locations.Length -gt 1 } | Sort-Object -Property ProviderNamespace
    foreach ($resourceType in ($filtered.ResourceTypes.ResourceTypeName | Sort-Object)) {
        $pos = $array.Add("$($provider.ProviderNamespace)/$($resourceType)")
    }
}
$jsonArray = $array | ConvertTo-Json
Write-Output  $jsonArray
