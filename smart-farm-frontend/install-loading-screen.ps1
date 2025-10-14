# =============================================================================
# Smart Loading Screen - Installation Script (PowerShell)
# =============================================================================

Write-Host "🌱 Smart Farm Loading Screen Installer" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: package.json not found. Please run this script from the frontend directory." -ForegroundColor Red
    exit 1
}

Write-Host "📦 Choose your version:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1) CSS-Only Version (Recommended - No dependencies)" -ForegroundColor White
Write-Host "  2) Lottie Animation Version (Requires npm packages)" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice (1 or 2)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "✅ CSS-Only Version Selected" -ForegroundColor Green
        Write-Host ""
        Write-Host "✨ Good choice! This version works immediately with zero dependencies." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "📝 Quick Setup Instructions:" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "1. Import the component in your app.component.ts:" -ForegroundColor White
        Write-Host "   import { SmartLoadingScreenSimpleComponent } from './shared/components/smart-loading-screen/smart-loading-screen-simple.component';" -ForegroundColor Gray
        Write-Host ""
        Write-Host "2. Add to your template:" -ForegroundColor White
        Write-Host '   <app-smart-loading-screen [isLoading]="isLoading" [message]="''Growing your smart network…''"></app-smart-loading-screen>' -ForegroundColor Gray
        Write-Host ""
        Write-Host "3. Run your app:" -ForegroundColor White
        Write-Host "   npm start" -ForegroundColor Gray
        Write-Host ""
        Write-Host "📚 For detailed instructions, see: QUICK_START_LOADING_SCREEN.md" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "🎉 You're all set! No installation needed." -ForegroundColor Green
    }
    "2" {
        Write-Host ""
        Write-Host "📦 Lottie Animation Version Selected" -ForegroundColor Green
        Write-Host ""
        Write-Host "Installing required packages..." -ForegroundColor Yellow
        Write-Host ""

        # Install packages
        try {
            npm install ngx-lottie lottie-web --save

            if ($LASTEXITCODE -eq 0) {
                Write-Host ""
                Write-Host "✅ Packages installed successfully!" -ForegroundColor Green
                Write-Host ""
                Write-Host "⚙️ Next Steps:" -ForegroundColor Cyan
                Write-Host ""
                Write-Host "1. Configure Lottie in your app.config.ts or app.module.ts" -ForegroundColor White
                Write-Host "   See LOADING_SCREEN_INSTALLATION.md for detailed instructions" -ForegroundColor Gray
                Write-Host ""
                Write-Host "2. Import the component:" -ForegroundColor White
                Write-Host "   import { SmartLoadingScreenComponent } from './shared/components/smart-loading-screen/smart-loading-screen.component';" -ForegroundColor Gray
                Write-Host ""
                Write-Host "3. Add to your template:" -ForegroundColor White
                Write-Host '   <app-smart-loading-screen [isLoading]="isLoading"></app-smart-loading-screen>' -ForegroundColor Gray
                Write-Host ""
                Write-Host "📚 Full documentation: LOADING_SCREEN_INSTALLATION.md" -ForegroundColor Cyan
                Write-Host ""
                Write-Host "🎉 Installation complete!" -ForegroundColor Green
            }
        }
        catch {
            Write-Host ""
            Write-Host "❌ Installation failed. Please try manually:" -ForegroundColor Red
            Write-Host "   npm install ngx-lottie lottie-web --save" -ForegroundColor Yellow
        }
    }
    default {
        Write-Host ""
        Write-Host "❌ Invalid choice. Please run the script again and choose 1 or 2." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "🌾 Happy farming! 🚜" -ForegroundColor Green
Write-Host ""

