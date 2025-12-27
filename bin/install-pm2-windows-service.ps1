<#
Helper PowerShell script to install pm2-windows-service and register a service for dv-app.
Run as Administrator.
Usage: .\install-pm2-windows-service.ps1 -Username <user> [-Password <pass>]
#>
param(
    [Parameter(Mandatory = $true)]
    [string]$Username,
    [Parameter(Mandatory = $false)]
    [string]$Password
)

# Ensure npm and pm2 are available
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Error "npm not found in PATH. Install Node.js and ensure npm is available."
    exit 1
}

# Install pm2 and pm2-windows-service globally
npm install -g pm2 pm2-windows-service

# Start the app using pm2
npm run deploy

# Save pm2 process list
pm2 save

# Install the Windows service
if (-not $Password) {
    Write-Host "No password provided; the installer will prompt if required."
}

# Use pm2-service-install (provided by pm2-windows-service)
$installCmd = "pm2-service-install -n dv-app -u $Username"
if ($Password) { $installCmd += " -p $Password" }
Write-Host "Running: $installCmd"
Invoke-Expression $installCmd

Write-Host "Service install attempted. Check Windows Services (services.msc) for 'dv-app' and ensure it is set to Automatic."
