import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

import { AuthService } from './core/services/auth.service';
import { LanguageService } from './core/services/language.service';
import { ThemeService } from './core/services/theme.service';
import { HeaderComponent } from './shared/components/header/header.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { SmartLoadingScreenSimpleComponent } from './shared/components/smart-loading-screen/smart-loading-screen-simple.component';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, HeaderComponent, FooterComponent, SmartLoadingScreenSimpleComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class AppComponent implements OnInit {
  private authService = inject(AuthService);
  private languageService = inject(LanguageService);
  private themeService = inject(ThemeService);

  isAuthenticated = this.authService.isAuthenticated;

  // Loading screen control
  isLoading = true;

  async ngOnInit() {
    // Always show loading screen first (even if already authenticated)
    this.isLoading = true;

    // Initialize auth service after Angular is ready
    await this.authService.initAuth();

    // Initialize theme service (this will apply the saved theme)
    // The theme service constructor already handles initialization

    // Show loading screen for at least 3 seconds to see the beautiful animation
    setTimeout(() => {
      this.isLoading = false;
    }, 3000); // 3 seconds to see the full animation
  }
}
