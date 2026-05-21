# supervisor.ps1 — SYS_v4 (3747) + KDS bridge (3939) 자동 감시 + 재기동.
#
# 사용 (백그라운드):
#   Start-Process powershell.exe -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','D:\SYS_v4\scripts\supervisor.ps1' -WindowStyle Hidden
#
# 중지:
#   Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*supervisor.ps1*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
#
# 로그:
#   d:\SYS_v4\logs\supervisor.log

$ErrorActionPreference = 'Continue'
$repoRoot = 'D:\SYS_v4'
$kdsRoot  = 'C:\Users\hj.moon\Downloads\AX_KDS_design system-v4\AX_KDS_design system-v4'
$logFile  = Join-Path $repoRoot 'logs\supervisor.log'
$logDir   = Split-Path -Parent $logFile
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Force -Path $logDir | Out-Null }

function Write-Log($msg) {
    $line = "[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg
    try { Add-Content -Path $logFile -Value $line -Encoding utf8 } catch {}
}

function Test-PortListening($port) {
    try {
        $c = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction Stop
        return ($null -ne $c)
    } catch { return $false }
}

function Start-Sys-V4 {
    Write-Log "SYS_v4 (3747) 재기동"
    $cmd = "set ESYS_DEV=1 && npm start"
    Start-Process cmd.exe -ArgumentList '/c', $cmd -WorkingDirectory $repoRoot -WindowStyle Hidden
}

function Start-Kds-Bridge {
    Write-Log "KDS bridge (3939) 재기동"
    Start-Process node.exe -ArgumentList 'bridge-server.js' -WorkingDirectory $kdsRoot -WindowStyle Hidden
}

# flapping 보호 — 5분 윈도우 안에서 N회 이상 재기동 시도 시 일시 정지
$state = @{
    SYS_v4     = @{ Restarts = New-Object System.Collections.Generic.List[datetime]; PausedUntil = $null }
    KDS_bridge = @{ Restarts = New-Object System.Collections.Generic.List[datetime]; PausedUntil = $null }
}

function Check-Flapping($name) {
    $now = Get-Date
    $s = $state[$name]
    # 5분 지난 기록 제거
    $s.Restarts = New-Object System.Collections.Generic.List[datetime] (,@($s.Restarts | Where-Object { ($now - $_).TotalMinutes -le 5 }))
    if ($s.Restarts.Count -ge 5) {
        $s.PausedUntil = $now.AddMinutes(5)
        Write-Log "$name flapping (5분 내 5회) — 5분 정지"
        return $true
    }
    if ($s.PausedUntil -and $now -lt $s.PausedUntil) { return $true }
    if ($s.PausedUntil -and $now -ge $s.PausedUntil) {
        $s.PausedUntil = $null
        $s.Restarts.Clear()
        Write-Log "$name 정지 해제"
    }
    $s.Restarts.Add($now)
    return $false
}

Write-Log "supervisor 시작 (PID $PID) — SYS_v4:3747, KDS_bridge:3939"

while ($true) {
    try {
        if (-not (Test-PortListening 3747)) {
            if (-not (Check-Flapping 'SYS_v4')) {
                Start-Sys-V4
                Start-Sleep -Seconds 6
            }
        }
        if (-not (Test-PortListening 3939)) {
            if (-not (Check-Flapping 'KDS_bridge')) {
                Start-Kds-Bridge
                Start-Sleep -Seconds 3
            }
        }
    } catch {
        Write-Log "supervisor loop error: $_"
    }
    Start-Sleep -Seconds 5
}
