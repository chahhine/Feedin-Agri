# 🌱 Smart Loading Screen Component

A beautiful, thematic loading screen for the Smart Farm Management System that merges nature and technology through animated visuals.

## 🎨 Features

- **Dual Lottie Animations**: Layered sprout growth and pulsing data ripples
- **Ambient Particles**: Floating glow particles for enhanced atmosphere
- **Network Visualization**: IoT-themed connected dots animation
- **Smooth Transitions**: Fade-in/out animations using Angular animations
- **Fully Responsive**: Adapts beautifully to mobile, tablet, and desktop
- **Accessibility**: Respects `prefers-reduced-motion` for users who need it
- **Production Ready**: Clean, documented, and optimized code

## 📦 Installation

### 1. Install Required Dependencies

```bash
npm install ngx-lottie lottie-web
```

### 2. Configure Lottie Module

Add to your `app.config.ts` or main module:

```typescript
import { provideLottieOptions } from 'ngx-lottie';
import player from 'lottie-web';

export const appConfig: ApplicationConfig = {
  providers: [
    // ... other providers
    provideLottieOptions({
      player: () => player,
    }),
  ]
};
```

Or for NgModule-based apps in `app.module.ts`:

```typescript
import { LottieModule } from 'ngx-lottie';
import player from 'lottie-web';

export function playerFactory() {
  return player;
}

@NgModule({
  imports: [
    // ... other imports
    LottieModule.forRoot({ player: playerFactory })
  ]
})
export class AppModule { }
```

## 🚀 Usage

### Basic Implementation

```typescript
import { Component } from '@angular/core';
import { SmartLoadingScreenComponent } from './shared/components/smart-loading-screen/smart-loading-screen.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [SmartLoadingScreenComponent],
  template: `
    <app-smart-loading-screen 
      [isLoading]="isLoading"
      [message]="loadingMessage">
    </app-smart-loading-screen>
    
    <router-outlet></router-outlet>
  `
})
export class AppComponent {
  isLoading = true;
  loadingMessage = 'Growing your smart network…';

  ngOnInit() {
    // Simulate loading
    setTimeout(() => {
      this.isLoading = false;
    }, 3000);
  }
}
```

### With Service Integration

Create a loading service:

```typescript
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  show() {
    this.loadingSubject.next(true);
  }

  hide() {
    this.loadingSubject.next(false);
  }
}
```

Then in your component:

```typescript
@Component({
  selector: 'app-root',
  template: `
    <app-smart-loading-screen 
      [isLoading]="loading$ | async">
    </app-smart-loading-screen>
  `
})
export class AppComponent {
  loading$ = this.loadingService.loading$;

  constructor(private loadingService: LoadingService) {}
}
```

### With HTTP Interceptor

```typescript
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { LoadingService } from './loading.service';

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  constructor(private loadingService: LoadingService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler) {
    this.loadingService.show();
    
    return next.handle(req).pipe(
      finalize(() => this.loadingService.hide())
    );
  }
}
```

## 🎯 Component API

### Inputs

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `isLoading` | `boolean` | `true` | Controls visibility of loading screen |
| `message` | `string` | `'Growing your smart network…'` | Custom loading message |

### Animations Used

- **Sprout Animation**: [Sprout Plant Animation by Issey](https://lottiefiles.com/2qifjpru)
- **Pulse Animation**: [Pulse Animation by Chetan Mani](https://lottiefiles.com/uwwfengd)

> **Note**: If the default Lottie URLs are unavailable, you can download the JSON files and host them locally in your `assets` folder.

## 🎨 Customization

### Change Colors

Edit the SCSS variables in `smart-loading-screen.component.scss`:

```scss
// Update gradient colors
background: linear-gradient(135deg, #YOUR_COLOR_1 0%, #YOUR_COLOR_2 50%, #YOUR_COLOR_3 100%);

// Update particle/glow colors
background: radial-gradient(circle, rgba(YOUR_R, YOUR_G, YOUR_B, 0.8) 0%, transparent 70%);
```

### Use Local Lottie Files

1. Download the Lottie JSON files
2. Place them in `src/assets/animations/`
3. Update the component:

```typescript
pulseOptions: AnimationOptions = {
  path: '/assets/animations/pulse.json',
  loop: true,
  autoplay: true
};

sproutOptions: AnimationOptions = {
  path: '/assets/animations/sprout.json',
  loop: false,
  autoplay: true
};
```

### Adjust Animation Sizes

In the SCSS file:

```scss
.animation-container {
  width: 500px;  // Change from 400px
  height: 500px; // Change from 400px
}
```

## 📱 Responsive Behavior

The component automatically adapts to different screen sizes:

- **Desktop**: Full 400x400px animation
- **Tablet**: 300x300px animation
- **Mobile**: 250x250px animation with scaled network dots

## ♿ Accessibility

The component respects user preferences:

- **Reduced Motion**: All animations are disabled when `prefers-reduced-motion` is set
- **Screen Readers**: Loading state is announced
- **High Contrast**: Text shadows ensure readability
- **Print**: Hidden in print stylesheets

## 🎭 Animation Details

### Sprout Behavior
1. Plays once on load (growth animation)
2. After completion, enters subtle "breathing" mode
3. Breathing effect is achieved by looping a small segment at slow speed

### Pulse Behavior
- Continuously loops throughout loading
- Synchronized with glow effect for cohesive visual

### Particle System
- 15 ambient particles drift upward
- Random positions, delays, and durations
- Creates organic, living atmosphere

## 🔧 Troubleshooting

### Lottie animations not showing

**Solution**: Ensure `ngx-lottie` and `lottie-web` are properly installed and configured:

```bash
npm install ngx-lottie lottie-web --save
```

### Animations lag on mobile

**Solution**: Reduce particle count in the component:

```typescript
const particleCount = 8; // Reduced from 15
```

### Custom Lottie URLs not working

**Solution**: Check CORS settings or use local files in the `assets` folder.

## 📄 License

This component is part of the Smart Farm Management System and follows the same license as the main project.

## 🤝 Credits

- **Lottie Animations**:
  - Sprout Plant Animation by [Issey](https://lottiefiles.com/issey)
  - Pulse Animation by [Chetan Mani](https://lottiefiles.com/chetanmani)
- **Design**: Smart Farm Team
- **Implementation**: Generated for Smart Farm Management System

---

**Made with 🌱 for farmers and technologists**

