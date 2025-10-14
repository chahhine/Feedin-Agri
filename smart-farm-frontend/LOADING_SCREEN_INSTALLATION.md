# 🌱 Smart Loading Screen - Installation Guide

Complete step-by-step guide to install and integrate the Smart Loading Screen component into your Smart Farm application.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation Steps](#installation-steps)
3. [Configuration](#configuration)
4. [Integration](#integration)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)

---

## ✅ Prerequisites

- Angular 17+ (Standalone components support)
- Node.js 18+ and npm 9+
- Basic understanding of Angular components

---

## 📦 Installation Steps

### Step 1: Install Required NPM Packages

Open your terminal in the `smart-farm-frontend` directory and run:

```bash
npm install ngx-lottie lottie-web --save
```

This installs:
- `ngx-lottie`: Angular wrapper for Lottie animations
- `lottie-web`: Core Lottie animation library

### Step 2: Verify Installation

Check your `package.json` to ensure the packages were added:

```json
{
  "dependencies": {
    "ngx-lottie": "^11.0.0",
    "lottie-web": "^5.12.0"
  }
}
```

---

## ⚙️ Configuration

### Option A: Standalone Application (Angular 17+)

If using standalone components with `app.config.ts`:

**File: `src/app/app.config.ts`**

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideLottieOptions } from 'ngx-lottie';
import player from 'lottie-web';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    provideLottieOptions({
      player: () => player,
    }),
  ],
};
```

### Option B: NgModule-based Application

If using traditional `app.module.ts`:

**File: `src/app/app.module.ts`**

```typescript
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { LottieModule } from 'ngx-lottie';
import player from 'lottie-web';

// Factory function for Lottie
export function playerFactory() {
  return player;
}

@NgModule({
  declarations: [
    AppComponent,
    // ... other components
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    LottieModule.forRoot({ player: playerFactory }),
    // ... other imports
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
```

---

## 🔧 Integration

### Method 1: Global Loading (Recommended)

Integrate into your main `app.component.ts`:

**File: `src/app/app.component.ts`**

```typescript
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SmartLoadingScreenComponent } from './shared/components/smart-loading-screen/smart-loading-screen.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    SmartLoadingScreenComponent
  ],
  template: `
    <!-- Global Loading Screen -->
    <app-smart-loading-screen 
      [isLoading]="isInitializing"
      [message]="'Growing your smart network…'">
    </app-smart-loading-screen>

    <!-- Main App Content -->
    <div *ngIf="!isInitializing">
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `]
})
export class AppComponent implements OnInit {
  isInitializing = true;

  ngOnInit() {
    // Simulate initial app setup
    setTimeout(() => {
      this.isInitializing = false;
    }, 3000);
  }
}
```

### Method 2: With Loading Service

Create a reusable loading service:

**File: `src/app/core/services/loading.service.ts`**

```typescript
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private messageSubject = new BehaviorSubject<string>('Loading...');

  public loading$: Observable<boolean> = this.loadingSubject.asObservable();
  public message$: Observable<string> = this.messageSubject.asObservable();

  show(message?: string) {
    if (message) {
      this.messageSubject.next(message);
    }
    this.loadingSubject.next(true);
  }

  hide() {
    this.loadingSubject.next(false);
  }
}
```

**Update `app.component.ts`:**

```typescript
import { Component } from '@angular/core';
import { SmartLoadingScreenComponent } from './shared/components/smart-loading-screen/smart-loading-screen.component';
import { LoadingService } from './core/services/loading.service';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [SmartLoadingScreenComponent, AsyncPipe],
  template: `
    <app-smart-loading-screen 
      [isLoading]="loading$ | async"
      [message]="message$ | async">
    </app-smart-loading-screen>
    
    <router-outlet></router-outlet>
  `
})
export class AppComponent {
  loading$ = this.loadingService.loading$;
  message$ = this.loadingService.message$;

  constructor(public loadingService: LoadingService) {}
}
```

### Method 3: Replace Existing Loading in index.html

**Update `src/index.html`:**

```html
<!doctype html>
<html lang="en">
<head>
  <!-- ... existing meta tags ... -->
</head>
<body>
  <app-root></app-root>
  
  <!-- REPLACE the existing loading div with this simpler version -->
  <!-- The Angular component will handle the beautiful loading -->
  <div id="initial-loading" style="
    position: fixed;
    inset: 0;
    background: linear-gradient(135deg, #1B5E20 0%, #2E7D32 50%, #33691E 100%);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
  ">
    <div style="color: white; font-family: 'Roboto', sans-serif; font-size: 1.2rem;">
      🌱 Loading...
    </div>
  </div>
  
  <script>
    // Hide initial loading when Angular bootstraps
    window.addEventListener('load', function() {
      setTimeout(function() {
        const loading = document.getElementById('initial-loading');
        if (loading) {
          loading.style.opacity = '0';
          loading.style.transition = 'opacity 0.5s';
          setTimeout(() => loading.remove(), 500);
        }
      }, 500);
    });
  </script>
</body>
</html>
```

---

## 🧪 Testing

### Quick Test

1. Run your development server:
```bash
npm start
# or
ng serve
```

2. Open `http://localhost:4200` in your browser

3. You should see the beautiful loading screen with:
   - Animated sprout growing
   - Pulsing data ripples
   - Floating ambient particles
   - IoT network dots
   - Loading message

### Create a Demo Page

**File: `src/app/pages/loading-demo/loading-demo.component.ts`**

```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SmartLoadingScreenComponent } from '../../shared/components/smart-loading-screen/smart-loading-screen.component';

@Component({
  selector: 'app-loading-demo',
  standalone: true,
  imports: [CommonModule, FormsModule, SmartLoadingScreenComponent],
  template: `
    <div class="demo-page">
      <div class="controls">
        <h2>Loading Screen Demo</h2>
        <button (click)="isLoading = !isLoading">
          {{ isLoading ? 'Hide' : 'Show' }} Loading
        </button>
        <input 
          [(ngModel)]="message" 
          placeholder="Custom message"
          (input)="updateMessage()">
      </div>

      <app-smart-loading-screen 
        [isLoading]="isLoading"
        [message]="message">
      </app-smart-loading-screen>
    </div>
  `,
  styles: [`
    .demo-page {
      padding: 2rem;
    }
    .controls {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      max-width: 600px;
      margin: 0 auto;
    }
    button {
      padding: 0.75rem 1.5rem;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      margin-top: 1rem;
    }
    input {
      width: 100%;
      padding: 0.75rem;
      margin-top: 1rem;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
  `]
})
export class LoadingDemoComponent {
  isLoading = true;
  message = 'Growing your smart network…';

  updateMessage() {
    // Message updates automatically via ngModel
  }
}
```

Add route to your router configuration:

```typescript
const routes: Routes = [
  // ... other routes
  { path: 'loading-demo', component: LoadingDemoComponent }
];
```

---

## 🐛 Troubleshooting

### Issue: "Cannot find module 'ngx-lottie'"

**Solution:**
```bash
npm install --save ngx-lottie lottie-web
ng serve --host 0.0.0.0
```

### Issue: Lottie animations not showing

**Cause:** Provider not configured correctly

**Solution:** Ensure you've added `provideLottieOptions` in `app.config.ts` or imported `LottieModule` in your module.

### Issue: Animations are laggy on mobile

**Solution:** Reduce particle count in the component:

```typescript
// In smart-loading-screen.component.ts
private generateParticles(): void {
  const particleCount = 8; // Reduced from 15
  // ... rest of code
}
```

### Issue: CORS error when loading Lottie files

**Solution:** Download and host Lottie files locally:

1. Download the animations:
   - Sprout: https://lottiefiles.com/2qifjpru
   - Pulse: https://lottiefiles.com/uwwfengd

2. Place in `src/assets/animations/`

3. Update component:
```typescript
pulseOptions: AnimationOptions = {
  path: '/assets/animations/pulse.json',
  loop: true,
  autoplay: true
};
```

### Issue: Component not found error

**Cause:** Import path incorrect

**Solution:** Ensure the import path matches your project structure:
```typescript
import { SmartLoadingScreenComponent } from './shared/components/smart-loading-screen/smart-loading-screen.component';
```

---

## ✨ Next Steps

1. **Customize colors** to match your brand
2. **Add to your authentication flow** for seamless UX
3. **Integrate with HTTP interceptor** for automatic loading states
4. **Test on different devices** for performance optimization

---

## 📚 Additional Resources

- [Component README](./src/app/shared/components/smart-loading-screen/README.md)
- [Usage Examples](./src/app/shared/components/smart-loading-screen/smart-loading-screen.example.ts)
- [ngx-lottie Documentation](https://github.com/ngx-lottie/ngx-lottie)
- [Lottie Files Library](https://lottiefiles.com/)

---

## 🎉 Congratulations!

You've successfully installed the Smart Loading Screen component! Your users will now experience a beautiful, thematic loading animation that represents the fusion of agriculture and technology.

**Need help?** Check the examples file or reach out to the development team.

---

**Made with 🌱 by the Smart Farm Team**

