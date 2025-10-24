/**
 * Smart Loading Screen Component - CSS-Only Version
 *
 * This is a simplified version that works without external dependencies.
 * No need to install ngx-lottie - pure CSS animations!
 *
 * For the full Lottie animation version, see smart-loading-screen.component.ts
 * and follow LOADING_SCREEN_INSTALLATION.md
 */

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-smart-loading-screen',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="loading-wrapper" *ngIf="isLoading" [@fadeInOut]>
      <!-- Ambient Glow Particles -->
      <div class="particle-container">
        <div *ngFor="let i of particleIndexes" class="particle" [style.--particle-index]="i"></div>
      </div>

      <!-- Background Gradient Overlay -->
      <div class="gradient-overlay"></div>

      <!-- Animation Container -->
      <div class="animation-container">
        <!-- CSS-based Pulse/Ripple Effect -->
        <div class="pulse-animation">
          <div class="pulse-circle pulse-1"></div>
          <div class="pulse-circle pulse-2"></div>
          <div class="pulse-circle pulse-3"></div>
        </div>

        <!-- CSS-based Sprout Animation - ULTRA REALISTIC -->
        <div class="sprout-animation">
          <div class="sprout-seed"></div>
          <div class="sprout-stem"></div>
          <div class="sprout-leaf sprout-leaf-left"></div>
          <div class="sprout-leaf sprout-leaf-right"></div>
          <div class="sprout-leaf sprout-leaf-top"></div>
          <div class="sprout-base"></div>
        </div>

        <!-- Glow Effect -->
        <div class="glow-effect"></div>
      </div>

      <!-- Loading Text and Progress -->
      <div class="loading-content">
        <div class="loading-icon">🌱</div>
        <h2 class="loading-message">{{ message }}</h2>

        <!-- Custom Progress Ring -->
        <div class="progress-ring">
          <svg class="progress-ring-svg" width="60" height="60">
            <circle
              class="progress-ring-circle"
              stroke="#A5D6A7"
              stroke-width="3"
              fill="transparent"
              r="26"
              cx="30"
              cy="30"
            />
          </svg>
        </div>
      </div>

      <!-- Network Dots Animation -->
      <div class="network-dots">
        <div class="dot dot-1"></div>
        <div class="dot dot-2"></div>
        <div class="dot dot-3"></div>
        <div class="connection connection-1"></div>
        <div class="connection connection-2"></div>
        <div class="connection connection-3"></div>
      </div>
    </div>
  `,
  styleUrls: ['./smart-loading-screen-simple.component.scss'],
  animations: [
    trigger('fadeInOut', [
      state('void', style({ opacity: 0 })),
      state('*', style({ opacity: 1 })),
      transition('void <=> *', animate('600ms ease-in-out'))
    ])
  ]
})
export class SmartLoadingScreenSimpleComponent {
  @Input() isLoading: boolean = true;
  @Input() message: string = 'Growing your smart network…';

  // Generate array for particle loop
  particleIndexes = Array.from({ length: 15 }, (_, i) => i);
}

