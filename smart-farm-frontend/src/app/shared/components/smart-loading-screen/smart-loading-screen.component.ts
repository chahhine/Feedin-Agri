import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { LottieComponent, AnimationOptions } from 'ngx-lottie';

@Component({
  selector: 'app-smart-loading-screen',
  standalone: true,
  imports: [CommonModule, LottieComponent],
  templateUrl: './smart-loading-screen.component.html',
  styleUrls: ['./smart-loading-screen.component.scss'],
  animations: [
    trigger('fadeInOut', [
      state('void', style({
        opacity: 0
      })),
      state('*', style({
        opacity: 1
      })),
      transition('void <=> *', animate('600ms ease-in-out'))
    ])
  ]
})
export class SmartLoadingScreenComponent implements OnInit {
  @Input() isLoading: boolean = true;
  @Input() message: string = 'Growing your smart network…';

  // Lottie animation options for the pulse/ripple effect
  pulseOptions: AnimationOptions = {
    path: 'https://assets3.lottiefiles.com/packages/lf20_uwwfengd.json', // Pulse Animation by Chetan Mani
    loop: true,
    autoplay: true
  };

  // Lottie animation options for the sprout
  sproutOptions: AnimationOptions = {
    path: 'https://assets10.lottiefiles.com/packages/lf20_2qifjpru.json', // Sprout Plant Animation by Issey
    loop: false,
    autoplay: true
  };

  // Particles for ambient effect
  particles: Array<{ left: number; delay: number; duration: number }> = [];

  ngOnInit(): void {
    this.generateParticles();
  }

  /**
   * Generate random particles for ambient glow effect
   */
  private generateParticles(): void {
    const particleCount = 15;
    for (let i = 0; i < particleCount; i++) {
      this.particles.push({
        left: Math.random() * 100, // Random horizontal position (%)
        delay: Math.random() * 5, // Random start delay (seconds)
        duration: 8 + Math.random() * 6 // Random duration between 8-14s
      });
    }
  }

  /**
   * Handle sprout animation completion
   * After the sprout finishes growing, make it subtly breathe/idle
   */
  onSproutComplete(anim: any): void {
    if (anim) {
      setTimeout(() => {
        // Create a subtle breathing effect by playing a portion of the animation
        anim.playSegments([60, 80], true); // Adjust frame numbers as needed
        anim.setSpeed(0.3); // Very slow for breathing effect
      }, 500);
    }
  }

  /**
   * Lottie animation created callback
   */
  onAnimationCreated(anim: any, type: 'pulse' | 'sprout'): void {
    if (type === 'sprout') {
      // Listen for completion event
      anim.addEventListener('complete', () => this.onSproutComplete(anim));
    }
  }
}

