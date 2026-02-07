# Collect all files using glob patterns (PowerShell style)
$distFiles = Get-ChildItem "webroot/dist" -Recurse -File | ForEach-Object {
    $rel = $_.FullName.Replace("$PWD\", "").Replace("\", "/")
    $fileName = Split-Path $rel -Leaf
    # Skip gzip for index.html
    if ($fileName -ne "index.html") {
        "$($rel):web_root/$($rel.Replace('webroot/dist/', '')):gzip"
    } else {
        "$($rel):web_root/$($rel.Replace('webroot/dist/', ''))"
    }
}

$certFiles = @()
if (Test-Path "certs") {
    $certFiles = Get-ChildItem "certs" -File | ForEach-Object {
        "certs/$($_.Name):certs/$($_.Name)"
    }
}

# Run pack.js with all file arguments
& node pack.js ($distFiles + $certFiles) | Out-File "webserver/net/webserver_packedfs.c" -Encoding utf8
