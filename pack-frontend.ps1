# Pack frontend files to C source
$distFiles = Get-ChildItem "webroot/dist" -Recurse -File | ForEach-Object {
    $rel = $_.FullName.Replace("$PWD\", "").Replace("\", "/")
    "$($rel):web_root/$($rel.Replace('webroot/dist/', ''))"
}

$certFiles = @()
if (Test-Path "certs") {
    $certFiles = Get-ChildItem "certs" -File | ForEach-Object {
        "certs/$($_.Name):certs/$($_.Name)"
    }
}

& node pack.js ($distFiles + $certFiles) | Out-File "webserver/net/webserver_packedfs.c" -Encoding utf8
