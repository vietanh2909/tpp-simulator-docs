# Chay chuoi nap quy tac cua AI-DLC tu dau den cuoi trong MOT lan, roi ghi chi thi cuoi cung ra tep.
# Cach dung (trong PowerShell, tai D:\pet-pj-dlc):
#   powershell -NoProfile -ExecutionPolicy Bypass -File .agents/tasks/chain.ps1
# Ket qua: .agents/tasks/directive.json (chi thi that cua buoc tiep theo) va .agents/tasks/chain-log.txt (tom tat tung buoc).
$ErrorActionPreference = 'Stop'
$outFile = Join-Path $PSScriptRoot 'directive.json'
$logFile = Join-Path $PSScriptRoot 'chain-log.txt'
Set-Content -Path $logFile -Value "chain bat dau $(Get-Date -Format o)"

$raw = (aidlc engine orchestrate next --resume | Out-String).Trim()
$guard = 0
while ($true) {
  $guard++
  if ($guard -gt 12) { Add-Content $logFile 'dung: qua 12 buoc'; break }
  try { $j = $raw | ConvertFrom-Json } catch { Add-Content $logFile "dung: khong doc duoc JSON o buoc $guard"; break }
  Add-Content $logFile ("buoc {0}: kind={1} stage={2} part={3}/{4} receipt={5}" -f $guard, $j.kind, $j.stage, $j.part, $j.parts, $j.receipt)
  if ($j.kind -ne 'load-steering') { break }
  $raw = (aidlc engine orchestrate continue $j.receipt | Out-String).Trim()
}
Set-Content -Path $outFile -Value $raw -Encoding utf8
Add-Content $logFile "xong. Chi thi cuoi da ghi vao directive.json"
