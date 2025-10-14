/**
 * EXAMPLE USAGE FILE
 * This file demonstrates how to integrate the SmartLoadingScreenComponent
 * into your Angular application.
 */

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SmartLoadingScreenComponent } from './smart-loading-screen.component';

// ============================================
// Example 1: Simple Component Usage
// ============================================

@Component({
  selector: 'app-example-simple',
  standalone: true,
  imports: [CommonModule, SmartLoadingScreenComponent],
  template: `
    <!-- Loading screen shown while data loads -->
    <app-smart-loading-screen
      [isLoading]="isLoading"
      [message]="'Initializing your farm dashboard…'">
    </app-smart-loading-screen>

    <!-- Your main content -->
    <div *ngIf="!isLoading">
      <h1>Welcome to Smart Farm!</h1>
      <p>Dashboard content here...</p>
    </div>
  `
})
export class ExampleSimpleComponent implements OnInit {
  isLoading = true;

  ngOnInit() {
    // Simulate data loading
    this.loadDashboardData();
  }

  private loadDashboardData() {
    // Simulating API call
    setTimeout(() => {
      console.log('Data loaded!');
      this.isLoading = false;
    }, 3000);
  }
}

// ============================================
// Example 2: With Loading Service
// ============================================

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

  private activeRequests = 0;

  show(message?: string) {
    this.activeRequests++;
    if (message) {
      this.messageSubject.next(message);
    }
    this.loadingSubject.next(true);
  }

  hide() {
    this.activeRequests--;
    if (this.activeRequests <= 0) {
      this.activeRequests = 0;
      this.loadingSubject.next(false);
      this.messageSubject.next('Loading...');
    }
  }

  forceHide() {
    this.activeRequests = 0;
    this.loadingSubject.next(false);
  }
}

@Component({
  selector: 'app-example-with-service',
  standalone: true,
  imports: [CommonModule, SmartLoadingScreenComponent],
  template: `
    <app-smart-loading-screen
      [isLoading]="(loading$ | async) ?? false"
      [message]="(message$ | async) ?? 'Loading...'">
    </app-smart-loading-screen>

    <div class="content">
      <button (click)="loadData()">Load Data</button>
    </div>
  `
})
export class ExampleWithServiceComponent {
  loading$: Observable<boolean>;
  message$: Observable<string>;

  constructor(private loadingService: LoadingService) {
    this.loading$ = this.loadingService.loading$;
    this.message$ = this.loadingService.message$;
  }

  loadData() {
    this.loadingService.show('Fetching sensor data…');

    // Simulate API call
    setTimeout(() => {
      this.loadingService.hide();
    }, 2000);
  }
}

// ============================================
// Example 3: App Root Integration
// ============================================

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, SmartLoadingScreenComponent, RouterOutlet],
  template: `
    <!-- Global loading screen -->
    <app-smart-loading-screen
      [isLoading]="isAppInitializing">
    </app-smart-loading-screen>

    <!-- App content -->
    <div *ngIf="!isAppInitializing">
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
export class AppRootExampleComponent implements OnInit {
  isAppInitializing = true;

  ngOnInit() {
    // Perform initial app setup
    this.initializeApp();
  }

  private async initializeApp() {
    try {
      // Load configuration
      await this.loadConfig();

      // Initialize services
      await this.initializeServices();

      // Check authentication
      await this.checkAuth();

      // App ready!
      this.isAppInitializing = false;
    } catch (error) {
      console.error('App initialization failed:', error);
      this.isAppInitializing = false;
    }
  }

  private loadConfig(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 500));
  }

  private initializeServices(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 800));
  }

  private checkAuth(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 700));
  }
}

// ============================================
// Example 4: HTTP Interceptor Integration
// ============================================

import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent
} from '@angular/common/http';
import { finalize } from 'rxjs/operators';

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  private totalRequests = 0;

  constructor(private loadingService: LoadingService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    this.totalRequests++;
    this.loadingService.show('Loading data…');

    return next.handle(req).pipe(
      finalize(() => {
        this.totalRequests--;
        if (this.totalRequests === 0) {
          this.loadingService.hide();
        }
      })
    );
  }
}

// ============================================
// Example 5: Router Loading Integration
// ============================================

import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-with-router',
  standalone: true,
  imports: [CommonModule, SmartLoadingScreenComponent, RouterOutlet],
  template: `
    <app-smart-loading-screen
      [isLoading]="isNavigating"
      [message]="'Loading page…'">
    </app-smart-loading-screen>

    <router-outlet></router-outlet>
  `
})
export class ExampleRouterComponent implements OnInit {
  isNavigating = false;

  constructor(private router: Router) {}

  ngOnInit() {
    // Show loading during navigation
    this.router.events.pipe(
      filter(event =>
        event instanceof NavigationStart ||
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      )
    ).subscribe(event => {
      if (event instanceof NavigationStart) {
        this.isNavigating = true;
      } else {
        this.isNavigating = false;
      }
    });
  }
}

// ============================================
// Example 6: Custom Messages Per Loading State
// ============================================

@Component({
  selector: 'app-custom-messages',
  standalone: true,
  imports: [CommonModule, SmartLoadingScreenComponent],
  template: `
    <app-smart-loading-screen
      [isLoading]="isLoading"
      [message]="currentMessage">
    </app-smart-loading-screen>
  `
})
export class ExampleCustomMessagesComponent implements OnInit {
  isLoading = true;
  currentMessage = 'Initializing…';

  private messages = [
    'Connecting to IoT devices…',
    'Syncing sensor data…',
    'Loading farm analytics…',
    'Preparing your dashboard…'
  ];

  ngOnInit() {
    this.startLoadingSequence();
  }

  private async startLoadingSequence() {
    for (const message of this.messages) {
      this.currentMessage = message;
      await this.delay(1000);
    }
    this.isLoading = false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================
// Example 7: Testing Mock Component
// ============================================

@Component({
  selector: 'app-loading-demo',
  standalone: true,
  imports: [CommonModule, FormsModule, SmartLoadingScreenComponent],
  template: `
    <div class="demo-controls">
      <button (click)="toggleLoading()">
        {{ isLoading ? 'Hide' : 'Show' }} Loading
      </button>
      <input
        type="text"
        [(ngModel)]="customMessage"
        placeholder="Custom message">
      <button (click)="updateMessage()">Update Message</button>
    </div>

    <app-smart-loading-screen
      [isLoading]="isLoading"
      [message]="displayMessage">
    </app-smart-loading-screen>
  `,
  styles: [`
    .demo-controls {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      background: white;
      padding: 1rem;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }

    button {
      margin: 0.5rem;
      padding: 0.5rem 1rem;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }

    input {
      margin: 0.5rem;
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
  `]
})
export class LoadingDemoComponent {
  isLoading = true;
  customMessage = '';
  displayMessage = 'Growing your smart network…';

  toggleLoading() {
    this.isLoading = !this.isLoading;
  }

  updateMessage() {
    if (this.customMessage.trim()) {
      this.displayMessage = this.customMessage;
    }
  }
}

