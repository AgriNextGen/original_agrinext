# Admin Page Testing Script - Manual Approach
# We'll use Playwright CLI to capture screenshots

# Test URLs
$pages = @(
    @{Name="Dashboard"; URL="/admin/dashboard"},
    @{Name="System Health"; URL="/admin/system-health"},
    @{Name="Disputes"; URL="/admin/disputes"},
    @{Name="Users"; URL="/admin/users"},
    @{Name="Farmers"; URL="/admin/farmers"},
    @{Name="Agents"; URL="/admin/agents"},
    @{Name="Logistics"; URL="/admin/logistics"},
    @{Name="Buyers"; URL="/admin/buyers"},
    @{Name="Finance"; URL="/admin/finance"},
    @{Name="Reports"; URL="/admin/reports"}
)

$baseURL = "http://localhost:5173"

Write-Host "🚀 Admin Page Testing - Manual Script" -ForegroundColor Cyan
Write-Host ""

# Create results directory
New-Item -ItemType Directory -Force -Path "admin-test-screenshots" | Out-Null

Write-Host "📝 Instructions:" -ForegroundColor Yellow
Write-Host "1. Open http://localhost:5173/login in your browser"
Write-Host "2. Click 'Admin' role button"
Write-Host "3. Enter phone: 9900000105"
Write-Host "4. Enter password: Dummy@12345"
Write-Host "5. Click 'Sign In'"
Write-Host ""
Write-Host "Then this script will capture screenshots of each admin page."
Write-Host ""
Read-Host "Press Enter when you're logged in as Admin"

$results = @()

Write-Host ""
Write-Host "📸 Capturing screenshots..." -ForegroundColor Cyan
Write-Host ""

foreach ($i in 0..($pages.Length-1)) {
    $page = $pages[$i]
    $num = ($i + 1).ToString("00")
    $fullURL = $baseURL + $page.URL
    $filename = "admin-test-screenshots/$num-$($page.Name -replace ' ','-' -replace '[^a-zA-Z0-9-]','').png"
    
    Write-Host "  $($i+1). $($page.Name)" -ForegroundColor White
    Write-Host "     URL: $fullURL" -ForegroundColor Gray
    
    try {
        # Use Playwright CLI to capture screenshot
        $result = npx playwright screenshot --timeout 30000 --wait-for-timeout 3000 $fullURL $filename 2>&1
        
        if (Test-Path $filename) {
            Write-Host "     Status: ✅ OK" -ForegroundColor Green
            $results += [PSCustomObject]@{
                Page = $page.Name
                URL = $page.URL
                Status = "OK"
                Issues = "None"
            }
        } else {
            Write-Host "     Status: ⚠️ FAILED" -ForegroundColor Yellow
            $results += [PSCustomObject]@{
                Page = $page.Name
                URL = $page.URL
                Status = "FAILED"
                Issues = "Screenshot not created"
            }
        }
    } catch {
        Write-Host "     Status: ❌ ERROR" -ForegroundColor Red
        Write-Host "     Error: $($_.Exception.Message)" -ForegroundColor Red
        $results += [PSCustomObject]@{
            Page = $page.Name
            URL = $page.URL
            Status = "ERROR"
            Issues = $_.Exception.Message
        }
    }
    
    Write-Host ""
}

Write-Host ""
Write-Host ("=" * 80) -ForegroundColor Cyan
Write-Host "📋 ADMIN PAGE TEST SUMMARY" -ForegroundColor Cyan
Write-Host ("=" * 80) -ForegroundColor Cyan
Write-Host ""

$results | Format-Table -AutoSize

$okCount = ($results | Where-Object { $_.Status -eq "OK" }).Count
$totalCount = $results.Count

Write-Host ""
Write-Host "✅ Passed: $okCount/$totalCount" -ForegroundColor Green
Write-Host "⚠️ Issues: $($totalCount - $okCount)/$totalCount" -ForegroundColor Yellow
Write-Host ""
Write-Host "📸 Screenshots saved to: admin-test-screenshots/" -ForegroundColor Cyan
Write-Host ""
