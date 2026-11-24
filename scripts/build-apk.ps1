$ErrorActionPreference = "Stop"

$sdkPathWin = if ($env:ANDROID_HOME) { $env:ANDROID_HOME }
              elseif ($env:ANDROID_SDK_ROOT) { $env:ANDROID_SDK_ROOT }
              else { Join-Path $env:LOCALAPPDATA "Android\Sdk" }

$sdkPathProps = $sdkPathWin -replace '\\', '/'
$javaHome     = if ($env:JAVA_HOME) { $env:JAVA_HOME }
                else { "C:\Program Files\Android\Android Studio\jbr" }

$projectRoot  = Resolve-Path (Join-Path $PSScriptRoot "..")
$androidDir   = Join-Path $projectRoot "android"
$localProps   = Join-Path $androidDir "local.properties"
$releaseDir   = Join-Path $projectRoot "release"

if (-not (Test-Path $localProps)) {
    Set-Content -Path $localProps -Value "sdk.dir=$sdkPathProps" -Encoding ascii -NoNewline
}

$innerCommand = "`$env:JAVA_HOME = `"$javaHome`"; " +
                "`$env:ANDROID_HOME = `"$sdkPathWin`"; " +
                "`$env:ANDROID_SDK_ROOT = `"$sdkPathWin`"; " +
                "`$env:PATH = `"$javaHome\bin;$sdkPathWin\platform-tools;`$env:PATH`"; " +
                "Set-Location `"$androidDir`"; " +
                ".\gradlew.bat assembleDebug --no-daemon; " +
                "exit `$LASTEXITCODE"

$encodedCommand = [Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes($innerCommand))

$proc = Start-Process -FilePath "powershell.exe" `
    -ArgumentList "-NoProfile", "-EncodedCommand", $encodedCommand `
    -Wait -NoNewWindow -PassThru

if ($proc.ExitCode -ne 0) {
    Write-Error "Gradle assembleDebug failed, exit code $($proc.ExitCode)"
    exit $proc.ExitCode
}

$apkSource = Join-Path $androidDir "app\build\outputs\apk\debug\app-debug.apk"
if (-not (Test-Path $apkSource)) {
    Write-Error "APK not found at $apkSource"
    exit 1
}

if (-not (Test-Path $releaseDir)) {
    New-Item -ItemType Directory -Path $releaseDir | Out-Null
}

$apkTarget = Join-Path $releaseDir "LeaBooks-Cinema-debug.apk"
Copy-Item -Path $apkSource -Destination $apkTarget -Force

$sizeMB = [math]::Round((Get-Item $apkTarget).Length / 1MB, 2)
$hash = (Get-FileHash -Path $apkTarget -Algorithm SHA256).Hash
Write-Output "APK built successfully: $apkTarget ($sizeMB MB)"
Write-Output "SHA-256: $hash"
