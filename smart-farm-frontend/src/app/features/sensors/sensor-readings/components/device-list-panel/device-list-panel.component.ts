import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatRippleModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { SensorStatus } from '../../utils/sensor-status.util';

export interface DeviceListItem {
  id: string;
  name: string;
  type: string;
  status: SensorStatus;
  value: number;
  unit: string;
  lastUpdate: Date | null;
  isPinned?: boolean;
}

@Component({
  selector: 'app-device-list-panel',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatRippleModule,
    MatTooltipModule,
    ScrollingModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="device-list" [class.compact]="density() === 'compact'">
      <!-- Panel Header -->
      <div class="panel-header">
        <div class="header-title">
          <mat-icon>devices</mat-icon>
          <span>Sensors</span>
          <span class="count">{{ items().length }}</span>
        </div>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="loading-state">
          @for (i of [1, 2, 3, 4, 5]; track i) {
            <div class="skeleton-item">
              <div class="skeleton-circle"></div>
              <div class="skeleton-content">
                <div class="skeleton-line"></div>
                <div class="skeleton-line short"></div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Device List with Virtual Scroll -->
      @if (!loading() && items().length > 0) {
        <cdk-virtual-scroll-viewport
          [itemSize]="getItemSize()"
          class="device-scroll">
          @for (item of items(); track item.id) {
            <div
              class="device-item"
              [class.selected]="selectedId() === item.id"
              [class.pinned]="item.isPinned"
              [class]="'status-' + item.status"
              (click)="itemClick.emit(item.id)"
              matRipple
              role="button"
              tabindex="0"
              [attr.aria-label]="item.name + ', ' + item.status"
              (keydown.enter)="itemClick.emit(item.id)"
              (keydown.space)="itemClick.emit(item.id)"
            >
              <!-- Status Badge -->
              <div class="status-badge" [class]="'badge-' + item.status">
                <mat-icon>{{ getStatusIcon(item.status) }}</mat-icon>
              </div>

              <!-- Device Info -->
              <div class="device-info">
                <div class="device-name">
                  @if (item.isPinned) {
                    <mat-icon class="pin-icon">push_pin</mat-icon>
                  }
                  {{ item.name }}
                </div>
                <div class="device-meta">
                  <span class="device-type">{{ item.type }}</span>
                  @if (item.lastUpdate) {
                    <span class="device-time">{{ formatTime(item.lastUpdate) }}</span>
                  }
                </div>
              </div>

              <!-- Value Display -->
              <div class="device-value">
                <span class="value">{{ item.value | number: '1.0-1' }}</span>
                <span class="unit">{{ item.unit }}</span>
              </div>

              <!-- Quick Actions -->
              <div class="quick-actions" (click)="$event.stopPropagation()">
                <button
                  mat-icon-button
                  [class.active]="item.isPinned"
                  (click)="pinToggle.emit(item.id)"
                  [matTooltip]="item.isPinned ? 'Unpin' : 'Pin to top'"
                  class="quick-btn"
                >
                  <mat-icon>{{ item.isPinned ? 'push_pin' : 'push_pin' }}</mat-icon>
                </button>
              </div>
            </div>
          }
        </cdk-virtual-scroll-viewport>
      }

      <!-- Empty State -->
      @if (!loading() && items().length === 0) {
        <div class="empty-state">
          <mat-icon>sensors_off</mat-icon>
          <p>No sensors found</p>
          <span>Adjust your filters</span>
        </div>
      }
    </aside>
  `,
  styles: [
    `
      .device-list {
        display: flex;
        flex-direction: column;
        background: var(--glass-bg, rgba(255, 255, 255, 0.75));
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border-radius: 20px;
        border: 1px solid var(--glass-border, rgba(16, 185, 129, 0.2));
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08),
                    inset 0 1px 1px rgba(255, 255, 255, 0.8);
        overflow: hidden;
        animation: fadeInLeft 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        height: 100%;
        min-height: 400px;
      }

      .device-list::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, #10b981, #34d399, #10b981);
        background-size: 200% 100%;
        animation: shimmer 3s linear infinite;
        opacity: 0.8;
      }

      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }

      @keyframes fadeInLeft {
        from {
          opacity: 0;
          transform: translateX(-30px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateX(0) scale(1);
        }
      }

      .panel-header {
        padding: 1.125rem 1rem;
        border-bottom: 1px solid rgba(16, 185, 129, 0.15);
        background: linear-gradient(135deg, rgba(240, 253, 244, 0.5), rgba(255, 255, 255, 0.3));
        backdrop-filter: blur(8px);
      }

      .header-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 700;
        font-size: 1.125rem;
        color: #2d3748;
      }

      .header-title mat-icon {
        color: #10b981;
      }

      .count {
        margin-left: auto;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 0.875rem;
        font-weight: 700;
        box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3),
                    inset 0 1px 1px rgba(255, 255, 255, 0.3);
        animation: countPulse 2s ease-in-out infinite;
      }

      @keyframes countPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }

      .loading-state {
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .skeleton-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        animation: pulse 1.5s ease-in-out infinite;
      }

      .skeleton-circle {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
      }

      .skeleton-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .skeleton-line {
        height: 12px;
        background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
        background-size: 200% 100%;
        border-radius: 6px;
        animation: shimmer 1.5s infinite;
      }

      .skeleton-line.short {
        width: 60%;
      }

      @keyframes shimmer {
        0% {
          background-position: 200% 0;
        }
        100% {
          background-position: -200% 0;
        }
      }

      .device-scroll {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
      }

      .device-scroll ::ng-deep .cdk-virtual-scroll-content-wrapper {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .device-item {
        display: grid;
        grid-template-columns: 48px 1fr auto auto;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.7);
        backdrop-filter: blur(8px);
        border: 1.5px solid transparent;
        cursor: pointer;
        transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
      }

      .device-item::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 4px;
        background: transparent;
        transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .device-item::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(16, 185, 129, 0.1), transparent);
        transform: translate(-50%, -50%);
        transition: width 0.6s ease, height 0.6s ease;
      }

      .device-item:hover {
        transform: translateX(6px) scale(1.01);
        box-shadow: 0 12px 32px rgba(16, 185, 129, 0.15),
                    inset 0 1px 1px rgba(255, 255, 255, 0.6);
        border-color: rgba(16, 185, 129, 0.4);
        background: rgba(255, 255, 255, 0.85);
      }

      .device-item:hover::after {
        width: 300px;
        height: 300px;
      }

      .device-item.selected {
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.08));
        border-color: #10b981;
        box-shadow: 0 8px 24px rgba(16, 185, 129, 0.25),
                    inset 0 1px 1px rgba(255, 255, 255, 0.5);
        transform: translateX(6px);
      }

      .device-item.selected::before {
        background: linear-gradient(180deg, #10b981, #059669);
        width: 5px;
        box-shadow: 2px 0 8px rgba(16, 185, 129, 0.5);
      }

      .device-item.pinned {
        background: linear-gradient(135deg, rgba(251, 191, 36, 0.12), rgba(245, 158, 11, 0.08));
        border-color: rgba(245, 158, 11, 0.3);
      }

      .device-item.status-critical::before {
        background: #ef4444;
      }

      .device-item.status-warning::before {
        background: #f59e0b;
      }

      .device-item.status-normal::before {
        background: #10b981;
      }

      .device-item.status-offline::before {
        background: #6b7280;
      }

      .status-badge {
        width: 48px;
        height: 48px;
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .badge-normal {
        background: linear-gradient(135deg, #d1fae5, #a7f3d0);
        color: #065f46;
      }

      .badge-warning {
        background: linear-gradient(135deg, #fef3c7, #fde68a);
        color: #92400e;
      }

      .badge-critical {
        background: linear-gradient(135deg, #fee2e2, #fecaca);
        color: #991b1b;
      }

      .badge-offline {
        background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
        color: #4b5563;
      }

      .device-item:hover .status-badge {
        transform: scale(1.1) rotate(5deg);
      }

      .device-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
      }

      .device-name {
        font-weight: 600;
        font-size: 0.9375rem;
        color: #1f2937;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .pin-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
        color: #f59e0b;
      }

      .device-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.75rem;
        color: #6b7280;
      }

      .device-type {
        font-weight: 500;
        text-transform: capitalize;
      }

      .device-time {
        opacity: 0.8;
      }

      .device-value {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 2px;
      }

      .value {
        font-size: 1.25rem;
        font-weight: 700;
        color: #1f2937;
        line-height: 1;
      }

      .unit {
        font-size: 0.75rem;
        color: #6b7280;
        font-weight: 500;
      }

      .quick-actions {
        opacity: 0;
        transition: opacity 0.2s;
      }

      .device-item:hover .quick-actions,
      .device-item:focus-within .quick-actions {
        opacity: 1;
      }

      .quick-btn {
        width: 32px;
        height: 32px;
        transition: all 0.2s;
      }

      .quick-btn mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      .quick-btn.active {
        color: #f59e0b;
        transform: rotate(45deg);
      }

      .empty-state {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        text-align: center;
        color: #9ca3af;
      }

      .empty-state mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        margin-bottom: 16px;
        opacity: 0.5;
      }

      .empty-state p {
        margin: 0 0 4px 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: #6b7280;
      }

      .empty-state span {
        font-size: 0.875rem;
      }

      .device-list.compact .device-item {
        padding: 8px;
        grid-template-columns: 40px 1fr auto auto;
      }

      .device-list.compact .status-badge {
        width: 40px;
        height: 40px;
      }

      .device-list.compact .device-name {
        font-size: 0.875rem;
      }

      .device-list.compact .value {
        font-size: 1.125rem;
      }

      @media (max-width: 1024px) {
        .device-list {
          border-radius: 16px;
        }
      }

      /* Dark theme support */
      :host-context(body.dark-theme) .device-list {
        background: var(--glass-bg, rgba(30, 41, 59, 0.75));
        border-color: var(--glass-border, rgba(100, 116, 139, 0.3));
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4),
                    inset 0 1px 1px rgba(100, 116, 139, 0.2);
      }

      :host-context(body.dark-theme) .device-list::before {
        background: linear-gradient(90deg, #059669, #10b981, #059669);
      }

      :host-context(body.dark-theme) .panel-header {
        background: linear-gradient(135deg, rgba(15, 23, 42, 0.5), rgba(30, 41, 59, 0.3));
        border-bottom-color: rgba(100, 116, 139, 0.2);
      }

      :host-context(body.dark-theme) .device-item {
        background: rgba(30, 41, 59, 0.7);
      }

      :host-context(body.dark-theme) .device-item:hover {
        background: rgba(30, 41, 59, 0.85);
        box-shadow: 0 12px 32px rgba(16, 185, 129, 0.2),
                    inset 0 1px 1px rgba(100, 116, 139, 0.3);
      }

      :host-context(body.dark-theme) .device-item.selected {
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.15));
        box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3),
                    inset 0 1px 1px rgba(100, 116, 139, 0.2);
      }

      :host-context(body.dark-theme) .device-name {
        color: #f1f5f9;
      }

      :host-context(body.dark-theme) .device-meta {
        color: #94a3b8;
      }

      :host-context(body.dark-theme) .value {
        color: #f1f5f9;
      }

      :host-context(body.dark-theme) .unit {
        color: #94a3b8;
      }

      :host-context(body.dark-theme) .count {
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.7), rgba(5, 150, 105, 0.6));
        color: #ffffff;
        box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4),
                    inset 0 1px 1px rgba(255, 255, 255, 0.2);
      }

      :host-context(body.dark-theme) .panel-header span {
        color: #f1f5f9;
      }

      :host-context(body.dark-theme) .badge-normal {
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(167, 243, 208, 0.25));
        color: #6ee7b7;
        border: 1px solid rgba(16, 185, 129, 0.4);
      }

      :host-context(body.dark-theme) .badge-warning {
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.3), rgba(253, 230, 138, 0.25));
        color: #fcd34d;
        border: 1px solid rgba(245, 158, 11, 0.4);
      }

      :host-context(body.dark-theme) .badge-critical {
        background: linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(254, 202, 202, 0.25));
        color: #fca5a5;
        border: 1px solid rgba(239, 68, 68, 0.4);
      }

      :host-context(body.dark-theme) .badge-offline {
        background: linear-gradient(135deg, rgba(107, 114, 128, 0.3), rgba(229, 231, 235, 0.15));
        color: #cbd5e1;
        border: 1px solid rgba(107, 114, 128, 0.4);
      }
    `,
  ],
})
export class DeviceListPanelComponent {
  // Inputs
  items = input<DeviceListItem[]>([]);
  selectedId = input<string | null>(null);
  loading = input<boolean>(false);
  density = input<'comfortable' | 'compact'>('comfortable');
  maxVisibleRows = input<number>(10);

  // Outputs
  itemClick = output<string>();
  pinToggle = output<string>();

  // Helper for dynamic item sizing
  getItemSize(): number {
    return this.density() === 'compact' ? 64 : 78;
  }

  getStatusIcon(status: SensorStatus): string {
    const icons: Record<SensorStatus, string> = {
      normal: 'check_circle',
      warning: 'warning',
      critical: 'error',
      offline: 'sensors_off',
    };
    return icons[status];
  }

  formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  }
}

