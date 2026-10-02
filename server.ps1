# Chameli Designer Boutique - Portable Web Server (PowerShell)
# 100% Environment-Agnostic: Works on any drive, folder, or server without hardcoded paths!

param (
    [int]$Port = 8080
)

# Dynamically resolve root directory using script location or current working path
$RootDir = $PSScriptRoot
if ([string]::IsNullOrEmpty($RootDir)) {
    $RootDir = (Get-Location).Path
}

$ImagesDir = Join-Path $RootDir "assets\images"
if (-not (Test-Path $ImagesDir)) {
    New-Item -ItemType Directory -Force -Path $ImagesDir | Out-Null
}

$CollectionsFile = Join-Path $ImagesDir "collections.json"
if (-not (Test-Path $CollectionsFile)) {
    "[]" | Out-File -FilePath $CollectionsFile -Encoding utf8
}

$Prefix = "http://localhost:$Port/"
$Listener = New-Object System.Net.HttpListener
$Listener.Prefixes.Add($Prefix)

try {
    $Listener.Start()
    Write-Host "==========================================================" -ForegroundColor DarkYellow
    Write-Host " Chameli Boutique Web Server active on $Prefix" -ForegroundColor Green
    Write-Host " Root Directory: $RootDir" -ForegroundColor Cyan
    Write-Host " Assets images directory: $ImagesDir" -ForegroundColor Cyan
    Write-Host "==========================================================" -ForegroundColor DarkYellow
} catch {
    Write-Host "Failed to start listener on port $Port : $_" -ForegroundColor Red
    exit 1
}

$ContentTypeMap = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".png"  = "image/png"
    ".webp" = "image/webp"
    ".svg"  = "image/svg+xml"
    ".pdf"  = "application/pdf"
}

function Send-JsonResponse($response, $dataObject, $statusCode = 200) {
    $json = $dataObject | ConvertTo-Json -Depth 5
    $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
    $response.StatusCode = $statusCode
    $response.ContentType = "application/json; charset=utf-8"
    $response.Headers.Add("Access-Control-Allow-Origin", "*")
    $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    $response.Headers.Add("Access-Control-Allow-Headers", "*")
    $response.ContentLength64 = $buffer.Length
    $response.OutputStream.Write($buffer, 0, $buffer.Length)
    $response.OutputStream.Close()
}

while ($Listener.IsListening) {
    try {
        $Context = $Listener.GetContext()
        $Request = $Context.Request
        $Response = $Context.Response

        $UrlPath = $Request.Url.AbsolutePath

        # CORS Headers for cross-origin requests
        $Response.Headers.Add("Access-Control-Allow-Origin", "*")
        $Response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        $Response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With")

        if ($Request.HttpMethod -eq "OPTIONS") {
            $Response.StatusCode = 200
            $Response.OutputStream.Close()
            continue
        }

        # API: Scan and Return ALL Image Files inside assets/images/
        if ($UrlPath -eq "/api/all-images" -and $Request.HttpMethod -eq "GET") {
            $files = Get-ChildItem -Path $ImagesDir | Where-Object { $_.Name -ne "collections.json" -and $_.Extension -match "\.(jpg|jpeg|png|webp|svg)" }
            $existingJson = Get-Content $CollectionsFile -Raw -Encoding utf8
            $metaDict = @{}
            if ($existingJson) {
                $metaList = $existingJson | ConvertFrom-Json
                if ($metaList) {
                    if ($metaList -isnot [array]) { $metaList = @($metaList) }
                    foreach ($m in $metaList) {
                        if ($m.fileName) { $metaDict[$m.fileName] = $m }
                    }
                }
            }

            $result = @()
            foreach ($f in $files) {
                $name = $f.Name
                $meta = if ($metaDict.ContainsKey($name)) { $metaDict[$name] } else { $null }
                
                $itemObj = [PSCustomObject]@{
                    id = if ($meta -and $meta.id) { $meta.id } else { "file_" + $name.Replace('.', '_') }
                    fileName = $name
                    imgSrc = "./assets/images/$name"
                    title = if ($meta -and $meta.title) { $meta.title } else { $name }
                    category = if ($meta -and $meta.category) { $meta.category } else { "general" }
                    categoryName = if ($meta -and $meta.categoryName) { $meta.categoryName } else { "Boutique Asset" }
                    price = if ($meta -and $meta.price) { $meta.price } else { "Stock Asset" }
                    target = if ($meta -and $meta.target) { $meta.target } else { "grid" }
                    size = ($f.Length / 1024).ToString("F1") + " KB"
                    isCustom = if ($meta) { $true } else { $false }
                }
                $result += $itemObj
            }

            Send-JsonResponse $Response $result
            continue
        }

        # API: Upload Asset File directly into assets/images/
        if ($UrlPath -eq "/api/upload" -and $Request.HttpMethod -eq "POST") {
            $reader = New-Object System.IO.StreamReader($Request.InputStream, $Request.ContentEncoding)
            $bodyText = $reader.ReadToEnd()
            $payload = $bodyText | ConvertFrom-Json

            if ($payload.fileName -and $payload.base64Data) {
                $rawExt = [System.IO.Path]::GetExtension($payload.fileName)
                if ([string]::IsNullOrEmpty($rawExt)) { $rawExt = ".jpg" }
                $baseName = [System.IO.Path]::GetFileNameWithoutExtension($payload.fileName) -replace '[^a-zA-Z0-9_\-]', '_'
                $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
                $finalFileName = "${timestamp}_${baseName}${rawExt}"
                $targetPath = Join-Path $ImagesDir $finalFileName

                $base64Raw = $payload.base64Data
                if ($base64Raw -like "data:*;base64,*") {
                    $base64Raw = $base64Raw.Split(",")[1]
                }
                $imageBytes = [System.Convert]::FromBase64String($base64Raw)
                [System.IO.File]::WriteAllBytes($targetPath, $imageBytes)

                Write-Host "[SUCCESS] Image saved to disk: $targetPath" -ForegroundColor Green

                $relImagePath = "./assets/images/$finalFileName"

                $itemsList = @()
                if (Test-Path $CollectionsFile) {
                    $existingText = Get-Content $CollectionsFile -Raw -Encoding utf8
                    if ($existingText -and $existingText.Trim() -ne "" -and $existingText.Trim() -ne "[]") {
                        $parsed = $existingText | ConvertFrom-Json
                        if ($parsed -is [array]) {
                            $itemsList = @($parsed)
                        } else {
                            $itemsList = @($parsed)
                        }
                    }
                }

                $newItem = [PSCustomObject]@{
                    id = "asset_" + [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
                    title = $payload.title
                    category = $payload.category
                    categoryName = $payload.categoryName
                    badge = if ($payload.badge) { $payload.badge } else { "New Arrival" }
                    price = $payload.price
                    fabric = $payload.fabric
                    target = $payload.target
                    description = $payload.description
                    imgSrc = $relImagePath
                    fileName = $finalFileName
                    timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
                }

                $itemsList = @($newItem) + $itemsList

                if ($itemsList.Count -eq 1) {
                    $updatedJson = "[" + ($newItem | ConvertTo-Json -Depth 5) + "]"
                } else {
                    $updatedJson = $itemsList | ConvertTo-Json -Depth 5
                }

                [System.IO.File]::WriteAllText($CollectionsFile, $updatedJson, [System.Text.Encoding]::UTF8)

                Send-JsonResponse $Response @{
                    success = $true
                    message = "Image saved directly to assets/images/$finalFileName"
                    item = $newItem
                }
            } else {
                Send-JsonResponse $Response @{ success = $false; message = "Invalid payload" } 400
            }
            continue
        }

        # API: Delete File from assets/images/
        if ($UrlPath -eq "/api/delete-file" -and $Request.HttpMethod -eq "POST") {
            $reader = New-Object System.IO.StreamReader($Request.InputStream, $Request.ContentEncoding)
            $payload = $reader.ReadToEnd() | ConvertFrom-Json
            $fileName = $payload.fileName
            $targetFile = Join-Path $ImagesDir $fileName

            # Protect official logo file chameli_logo.jpg from accidental API deletion
            if ($fileName -eq "chameli_logo.jpg") {
                Send-JsonResponse $Response @{ success = $false; message = "Official logo is protected" } 400
                continue
            }

            if (Test-Path $targetFile) {
                Remove-Item $targetFile -Force
            }

            if (Test-Path $CollectionsFile) {
                $existingText = Get-Content $CollectionsFile -Raw -Encoding utf8
                if ($existingText) {
                    $parsed = $existingText | ConvertFrom-Json
                    if ($parsed) {
                        if ($parsed -isnot [array]) { $parsed = @($parsed) }
                        $filtered = @($parsed | Where-Object { $_.fileName -ne $fileName -and $_.id -ne $payload.id })
                        $jsonOut = "[]"
                        if ($filtered.Count -eq 1) {
                            $jsonOut = "[" + ($filtered[0] | ConvertTo-Json -Depth 5) + "]"
                        } elseif ($filtered.Count -gt 1) {
                            $jsonOut = $filtered | ConvertTo-Json -Depth 5
                        }
                        [System.IO.File]::WriteAllText($CollectionsFile, $jsonOut, [System.Text.Encoding]::UTF8)
                    }
                }
            }

            Send-JsonResponse $Response @{ success = $true; message = "File $fileName deleted from assets/images/" }
            continue
        }

        # API: Get Collections List
        if ($UrlPath -eq "/api/collections" -and $Request.HttpMethod -eq "GET") {
            $jsonContent = Get-Content $CollectionsFile -Raw -Encoding utf8
            if (-not $jsonContent -or $jsonContent.Trim() -eq "") { $jsonContent = "[]" }
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($jsonContent)
            $Response.ContentType = "application/json; charset=utf-8"
            $Response.ContentLength64 = $buffer.Length
            $Response.OutputStream.Write($buffer, 0, $buffer.Length)
            $Response.OutputStream.Close()
            continue
        }

        # Static File Handler
        if ($UrlPath -eq "/") { $UrlPath = "/index.html" }
        $localPath = Join-Path $RootDir ($UrlPath.TrimStart('/').Replace('/', '\'))

        if (Test-Path $localPath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($localPath).ToLower()
            $contentType = if ($ContentTypeMap.ContainsKey($ext)) { $ContentTypeMap[$ext] } else { "application/octet-stream" }

            $bytes = [System.IO.File]::ReadAllBytes($localPath)
            $Response.ContentType = $contentType
            $Response.ContentLength64 = $bytes.Length
            $Response.StatusCode = 200
            $Response.OutputStream.Write($bytes, 0, $bytes.Length)
            $Response.OutputStream.Close()
        } else {
            $Response.StatusCode = 404
            $errBuffer = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $Response.OutputStream.Write($errBuffer, 0, $errBuffer.Length)
            $Response.OutputStream.Close()
        }

    } catch {
        Write-Host "Error processing request: $_" -ForegroundColor Red
    }
}
