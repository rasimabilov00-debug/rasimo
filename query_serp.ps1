$apiKey = "add5aad78f011508f58dba56bf399f0b97a0bb84094c460a1552e8d194cb7dfc"
$uri = "https://serpapi.com/search.json?engine=google_maps&q=restaurants+in+Budapest&location=Budapest%2C+Hungary&type=search&api_key=$apiKey"
try {
    $response = Invoke-RestMethod -Uri $uri -Method Get
    Write-Host "local_results exists: $(($null -ne $response.local_results))"
    if ($null -ne $response.local_results) {
        $results = $response.local_results
        Write-Host "local_results count: $($results.Count)"
        if ($results.Count -gt 0) {
            Write-Host "First result title: $($results[0].title)"
            Write-Host "First result address: $($results[0].address)"
        }
    } else {
        Write-Host "local_results count: 0"
    }
} catch {
    Write-Error $_
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Error Details: $($reader.ReadToEnd())"
    }
}
