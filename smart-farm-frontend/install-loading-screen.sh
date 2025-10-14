#!/bin/bash

# =============================================================================
# Smart Loading Screen - Installation Script
# =============================================================================

echo "🌱 Smart Farm Loading Screen Installer"
echo "========================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the frontend directory."
    exit 1
fi

echo "📦 Choose your version:"
echo ""
echo "  1) CSS-Only Version (Recommended - No dependencies)"
echo "  2) Lottie Animation Version (Requires npm packages)"
echo ""
read -p "Enter your choice (1 or 2): " choice

case $choice in
    1)
        echo ""
        echo "✅ CSS-Only Version Selected"
        echo ""
        echo "✨ Good choice! This version works immediately with zero dependencies."
        echo ""
        echo "📝 Quick Setup Instructions:"
        echo ""
        echo "1. Import the component in your app.component.ts:"
        echo "   import { SmartLoadingScreenSimpleComponent } from './shared/components/smart-loading-screen/smart-loading-screen-simple.component';"
        echo ""
        echo "2. Add to your template:"
        echo "   <app-smart-loading-screen [isLoading]=\"isLoading\" [message]=\"'Growing your smart network…'\"></app-smart-loading-screen>"
        echo ""
        echo "3. Run your app:"
        echo "   npm start"
        echo ""
        echo "📚 For detailed instructions, see: QUICK_START_LOADING_SCREEN.md"
        echo ""
        echo "🎉 You're all set! No installation needed."
        ;;
    2)
        echo ""
        echo "📦 Lottie Animation Version Selected"
        echo ""
        echo "Installing required packages..."
        echo ""

        # Install packages
        npm install ngx-lottie lottie-web --save

        if [ $? -eq 0 ]; then
            echo ""
            echo "✅ Packages installed successfully!"
            echo ""
            echo "⚙️ Next Steps:"
            echo ""
            echo "1. Configure Lottie in your app.config.ts or app.module.ts"
            echo "   See LOADING_SCREEN_INSTALLATION.md for detailed instructions"
            echo ""
            echo "2. Import the component:"
            echo "   import { SmartLoadingScreenComponent } from './shared/components/smart-loading-screen/smart-loading-screen.component';"
            echo ""
            echo "3. Add to your template:"
            echo "   <app-smart-loading-screen [isLoading]=\"isLoading\"></app-smart-loading-screen>"
            echo ""
            echo "📚 Full documentation: LOADING_SCREEN_INSTALLATION.md"
            echo ""
            echo "🎉 Installation complete!"
        else
            echo ""
            echo "❌ Installation failed. Please try manually:"
            echo "   npm install ngx-lottie lottie-web --save"
        fi
        ;;
    *)
        echo ""
        echo "❌ Invalid choice. Please run the script again and choose 1 or 2."
        exit 1
        ;;
esac

echo ""
echo "🌾 Happy farming! 🚜"
echo ""

