$result = Test-NetConnection -ComputerName localhost -Port 5000 -WarningAction SilentlyContinue
if ($result.TcpTestSucceeded) {
    Write-Host "Port 5000 is OPEN - Python ML running"
} else {
    Write-Host "Port 5000 is CLOSED - Python ML not running"
}

$result2 = Test-NetConnection -ComputerName localhost -Port 3000 -WarningAction SilentlyContinue
if ($result2.TcpTestSucceeded) {
    Write-Host "Port 3000 is OPEN - Node server running"
} else {
    Write-Host "Port 3000 is CLOSED - Node server not running"
}
