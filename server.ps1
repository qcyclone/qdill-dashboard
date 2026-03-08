param(
  [int]$Port = 8765
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()

function Write-JsonResponse {
  param(
    [Parameter(Mandatory=$true)] $Context,
    [Parameter(Mandatory=$true)] $Object,
    [int]$StatusCode = 200
  )

  $json = $Object | ConvertTo-Json -Depth 6 -Compress
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  $Context.Response.StatusCode = $StatusCode
  $Context.Response.ContentType = "application/json; charset=utf-8"
  $Context.Response.Headers["Access-Control-Allow-Origin"] = "*"
  $Context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $Context.Response.OutputStream.Close()
}

function Write-FileResponse {
  param(
    [Parameter(Mandatory=$true)] $Context,
    [Parameter(Mandatory=$true)] [string]$FilePath
  )

  if (-not (Test-Path $FilePath)) {
    $Context.Response.StatusCode = 404
    $Context.Response.OutputStream.Close()
    return
  }

  $ext = [System.IO.Path]::GetExtension($FilePath).ToLowerInvariant()
  $contentType = switch ($ext) {
    ".html" { "text/html; charset=utf-8" }
    ".css"  { "text/css; charset=utf-8" }
    ".js"   { "application/javascript; charset=utf-8" }
    default  { "application/octet-stream" }
  }

  $bytes = [System.IO.File]::ReadAllBytes($FilePath)
  $Context.Response.StatusCode = 200
  $Context.Response.ContentType = $contentType
  $Context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $Context.Response.OutputStream.Close()
}

function Get-BeijingToday {
  $tz = [System.TimeZoneInfo]::FindSystemTimeZoneById("China Standard Time")
  $cn = [System.TimeZoneInfo]::ConvertTimeFromUtc([datetime]::UtcNow, $tz)
  return $cn.ToString("yyyy-MM-dd")
}

function Parse-Jsonp {
  param([string]$Text)

  $m = [regex]::Match($Text, "\((\{[\s\S]*\})\)\s*;?")
  if (-not $m.Success) {
    throw "Invalid JSONP payload"
  }

  return ($m.Groups[1].Value | ConvertFrom-Json)
}

function Parse-Date([string]$date) {
  return [datetime]::ParseExact($date, "yyyy-MM-dd", $null)
}

function Find-NavOnOrBefore {
  param(
    [Parameter(Mandatory=$true)] $Records,
    [Parameter(Mandatory=$true)] [string]$DateStr
  )

  foreach ($r in $Records) {
    if ($r.date -le $DateStr -and $null -ne $r.nav) {
      return [double]$r.nav
    }
  }

  return $null
}

function Calc-Growth {
  param(
    [double]$CurrentNav,
    $BaseNav
  )

  if ($null -eq $BaseNav) { return $null }
  if ($BaseNav -le 0) { return $null }

  return [math]::Round((($CurrentNav / [double]$BaseNav) - 1) * 100, 2)
}

function Get-FundSnapshot {
  param([string]$Code)

  $headers = @{
    "Referer" = "http://fundf10.eastmoney.com/"
    "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36"
    "Accept" = "*/*"
  }

  $ts = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  $cb = "jQuery1830$ts"

  $lsjzUrl = "https://api.fund.eastmoney.com/f10/lsjz?callback=$cb&fundCode=$Code&pageIndex=1&pageSize=400&startDate=&endDate=&_=$ts"
  $lsjzRaw = (Invoke-WebRequest -Uri $lsjzUrl -Headers $headers -UseBasicParsing -TimeoutSec 12).Content
  $lsjzObj = Parse-Jsonp -Text $lsjzRaw

  $list = $lsjzObj.Data.LSJZList
  if ($null -eq $list -or $list.Count -eq 0) {
    throw "empty LSJZList"
  }

  $records = @()
  foreach ($item in $list) {
    $date = [string]$item.FSRQ
    if ($date.Length -ge 10) { $date = $date.Substring(0, 10) }
    $nav = $null
    if ([double]::TryParse([string]$item.DWJZ, [ref]$nav) -eq $false) { $nav = $null }
    $dayGrowth = $null
    if ([double]::TryParse([string]$item.JZZZL, [ref]$dayGrowth) -eq $false) { $dayGrowth = $null }

    if ($date -and $null -ne $nav) {
      $records += [pscustomobject]@{
        date = $date
        nav = $nav
        dayGrowth = $dayGrowth
      }
    }
  }

  $records = $records | Sort-Object date -Descending
  if ($records.Count -eq 0) {
    throw "no valid nav records"
  }

  $ttUrl = "https://fundgz.1234567.com.cn/js/$Code.js?rt=$ts"
  $ttName = $null
  $ttGrowth = $null
  $ttDate = $null

  try {
    $ttRaw = (Invoke-WebRequest -Uri $ttUrl -Headers $headers -UseBasicParsing -TimeoutSec 8).Content
    $ttObj = Parse-Jsonp -Text $ttRaw
    $ttName = [string]$ttObj.name
    if ([double]::TryParse([string]$ttObj.gszzl, [ref]$ttGrowth) -eq $false) { $ttGrowth = $null }
    $tmpDate = [string]$ttObj.gztime
    if ($tmpDate.Length -ge 10) { $ttDate = $tmpDate.Substring(0, 10) }
  } catch {
  }

  $today = Get-BeijingToday
  $latest = $records[0]

  $growthDate = $latest.date
  $todayGrowth = $latest.dayGrowth
  $effectiveNav = [double]$latest.nav

  if ($null -ne $ttGrowth -and $ttDate -eq $today) {
    $growthDate = $today
    $todayGrowth = [math]::Round($ttGrowth, 2)
    $effectiveNav = [math]::Round([double]$latest.nav * (1 + $todayGrowth / 100), 6)
  }

  if ($growthDate -gt $today) {
    $growthDate = $today
  }

  if ($growthDate -ne $today) {
    $yesterday = (Parse-Date $today).AddDays(-1).ToString("yyyy-MM-dd")
    if ($growthDate -gt $yesterday) {
      $growthDate = $yesterday
    }
  }

  $oneYearDate = (Parse-Date $today).AddYears(-1).ToString("yyyy-MM-dd")
  $yearStart = "{0}-01-01" -f (Parse-Date $today).ToString("yyyy")

  $oneYearBase = Find-NavOnOrBefore -Records $records -DateStr $oneYearDate
  $yearBase = Find-NavOnOrBefore -Records $records -DateStr $yearStart

  $ytd = Calc-Growth -CurrentNav $effectiveNav -BaseNav $oneYearBase
  $year = Calc-Growth -CurrentNav $effectiveNav -BaseNav $yearBase

  return [pscustomobject]@{
    code = $Code
    name = if ($ttName) { $ttName } else { $null }
    ytd = $ytd
    year = $year
    today = if ($null -ne $todayGrowth) { [math]::Round([double]$todayGrowth, 2) } else { $null }
    date = $growthDate
    source = if ($ttDate -eq $today -and $null -ne $ttGrowth) { "TT+EM" } else { "EM" }
  }
}

Write-Host "Server running: http://127.0.0.1:$Port" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop." -ForegroundColor Yellow

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $path = $context.Request.Url.AbsolutePath

    if ($context.Request.HttpMethod -eq "OPTIONS") {
      $context.Response.StatusCode = 204
      $context.Response.Headers["Access-Control-Allow-Origin"] = "*"
      $context.Response.Headers["Access-Control-Allow-Methods"] = "GET,OPTIONS"
      $context.Response.Headers["Access-Control-Allow-Headers"] = "*"
      $context.Response.OutputStream.Close()
      continue
    }

    if ($path -eq "/api/fund") {
      $code = $context.Request.QueryString["code"]
      if ([string]::IsNullOrWhiteSpace($code)) {
        Write-JsonResponse -Context $context -Object @{ ok = $false; error = "missing code" } -StatusCode 400
        continue
      }

      try {
        $snapshot = Get-FundSnapshot -Code $code
        Write-JsonResponse -Context $context -Object @{ ok = $true; data = $snapshot }
      } catch {
        Write-JsonResponse -Context $context -Object @{ ok = $false; code = $code; error = $_.Exception.Message } -StatusCode 502
      }

      continue
    }

    $target = if ($path -eq "/" -or $path -eq "") {
      Join-Path $root "index.html"
    } else {
      $local = $path.TrimStart('/').Replace('/', '\\')
      Join-Path $root $local
    }

    Write-FileResponse -Context $context -FilePath $target
  }
}
finally {
  $listener.Stop()
  $listener.Close()
}
