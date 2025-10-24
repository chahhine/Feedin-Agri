import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { SensorStatus } from '../../utils/sensor-status.util';

export interface DeviceDetail {
  id: string;
  name: string;
  type: string;
  status: SensorStatus;
  currentValue: number;
  unit: string;
  lastUpdate: Date | null;
  delta1h?: number;
  thresholds: {
    min: number;
    max: number;
    optimalMin: number;
    optimalMax: number;
  };
  chartData: Array<{ name: Date; value: number }>;
}

@Component({
  selector: 'app-device-detail-panel',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatTabsModule,
    MatTooltipModule,
    NgxChartsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="detail-panel">
      @if (loading()) {
        <!-- Loading Skeleton -->
        <div class="loading-detail">
          <div class="skeleton-header">
            <div class="skeleton-circle large"></div>
            <div class="skeleton-content">
              <div class="skeleton-line"></div>
              <div class="skeleton-line short"></div>
            </div>
          </div>
          <div class="skeleton-chart"></div>
        </div>
      } @else if (device()) {
        <!-- Device Header -->
        <div class="detail-header" [class]="'status-' + device()!.status">
          <div class="header-left">
            <div class="status-icon" [class]="'icon-' + device()!.status">
              <mat-icon>{{ getStatusIcon(device()!.status) }}</mat-icon>
            </div>
            <div class="header-info">
              <h2>{{ device()!.name }}</h2>
              <p class="device-type">{{ device()!.type }}</p>
            </div>
          </div>
          <div class="status-chip" [class]="'chip-' + device()!.status">
            {{ device()!.status | uppercase }}
          </div>
        </div>

        <!-- KPIs -->
        <div class="kpi-section">
          <div class="kpi-card primary">
            <div class="kpi-icon">
              <mat-icon>thermostat</mat-icon>
            </div>
            <div class="kpi-content">
              <span class="kpi-label">Current Value</span>
              <div class="kpi-value-row">
                <span class="kpi-value">{{ device()!.currentValue | number: '1.0-2' }}</span>
                <span class="kpi-unit">{{ device()!.unit }}</span>
                @if (device()!.delta1h !== undefined && device()!.delta1h !== null) {
                  <span class="kpi-delta" [class.positive]="device()!.delta1h! > 0" [class.negative]="device()!.delta1h! < 0">
                    <mat-icon>{{ device()!.delta1h! > 0 ? 'trending_up' : 'trending_down' }}</mat-icon>
                    {{ device()!.delta1h! > 0 ? '+' : '' }}{{ device()!.delta1h | number: '1.0-1' }}
                  </span>
                }
              </div>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon secondary">
              <mat-icon>schedule</mat-icon>
            </div>
            <div class="kpi-content">
              <span class="kpi-label">Last Update</span>
              <span class="kpi-text">{{ formatDateTime(device()!.lastUpdate) }}</span>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon tertiary">
              <mat-icon>insights</mat-icon>
            </div>
            <div class="kpi-content">
              <span class="kpi-label">Optimal Range</span>
              <span class="kpi-text">{{ device()!.thresholds.optimalMin }} – {{ device()!.thresholds.optimalMax }} {{ device()!.unit }}</span>
            </div>
          </div>
        </div>

        <!-- Threshold Visual -->
        <div class="threshold-section">
          <div class="threshold-header">
            <mat-icon>tune</mat-icon>
            <span>Threshold Zones</span>
          </div>
          <div class="threshold-bar">
            <div class="bar-track">
              <div
                class="optimal-zone"
                [style.left.%]="getPosition(device()!.thresholds.optimalMin)"
                [style.width.%]="getWidth(device()!.thresholds.optimalMin, device()!.thresholds.optimalMax)"
              ></div>
              <div
                class="current-marker"
                [style.left.%]="getPosition(device()!.currentValue)"
                [matTooltip]="'Current: ' + device()!.currentValue + ' ' + device()!.unit"
              >
                <div class="marker-pulse"></div>
              </div>
            </div>
            <div class="threshold-labels">
              <span class="label-min">{{ device()!.thresholds.min }}</span>
              <span class="label-optimal-min">{{ device()!.thresholds.optimalMin }}</span>
              <span class="label-optimal-max">{{ device()!.thresholds.optimalMax }}</span>
              <span class="label-max">{{ device()!.thresholds.max }}</span>
            </div>
          </div>
        </div>

        <!-- Chart -->
        <div class="chart-section">
          <div class="chart-header">
            <mat-icon>show_chart</mat-icon>
            <span>Historical Data</span>
          </div>
          @if (chartSeriesData().length > 0) {
            <div class="chart-container">
              <ngx-charts-line-chart
                [results]="chartSeriesData()"
                [xAxis]="true"
                [yAxis]="true"
                [showXAxisLabel]="false"
                [showYAxisLabel]="false"
                [timeline]="true"
                [autoScale]="true"
                [curve]="curveFunction"
                [animations]="true"
                [scheme]="colorScheme"
                [showGridLines]="true"
                [gradient]="true"
              >
              </ngx-charts-line-chart>
            </div>
          } @else {
            <div class="no-chart-data">
              <mat-icon>timeline</mat-icon>
              <p>No historical data available</p>
            </div>
          }
        </div>
      } @else {
        <!-- Empty State -->
        <div class="empty-detail">
          <div class="empty-icon">
            <mat-icon>touch_app</mat-icon>
          </div>
          <h3>Select a Sensor</h3>
          <p>Choose a sensor from the list to view detailed information and charts</p>
        </div>
      }
    </section>
  `,
  styles: [
    `
      .detail-panel {
        height: 100%;
        background: linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%);
        border-radius: 20px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
        overflow: auto;
        animation: fadeInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      @keyframes fadeInRight {
        from {
          opacity: 0;
          transform: translateX(20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      .loading-detail {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      .skeleton-header {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .skeleton-circle {
        border-radius: 50%;
        background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
      }

      .skeleton-circle.large {
        width: 64px;
        height: 64px;
      }

      .skeleton-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .skeleton-line {
        height: 16px;
        background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
        background-size: 200% 100%;
        border-radius: 8px;
        animation: shimmer 1.5s infinite;
      }

      .skeleton-line.short {
        width: 60%;
      }

      .skeleton-chart {
        height: 300px;
        background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
        background-size: 200% 100%;
        border-radius: 16px;
        animation: shimmer 1.5s infinite;
      }

      @keyframes shimmer {
        0% {
          background-position: 200% 0;
        }
        100% {
          background-position: -200% 0;
        }
      }

      .detail-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        background: white;
        border-radius: 16px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
        border-left: 4px solid transparent;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .detail-header.status-critical {
        border-left-color: #ef4444;
        background: linear-gradient(to right, rgba(239, 68, 68, 0.05), white);
      }

      .detail-header.status-warning {
        border-left-color: #f59e0b;
        background: linear-gradient(to right, rgba(245, 158, 11, 0.05), white);
      }

      .detail-header.status-normal {
        border-left-color: #10b981;
        background: linear-gradient(to right, rgba(16, 185, 129, 0.05), white);
      }

      .detail-header.status-offline {
        border-left-color: #6b7280;
        background: linear-gradient(to right, rgba(107, 114, 128, 0.05), white);
      }

      .header-left {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .status-icon {
        width: 64px;
        height: 64px;
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s;
        border: 1px solid transparent;
      }

      .status-icon mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
      }

      .icon-normal {
        background: linear-gradient(135deg, #d1fae5, #a7f3d0);
        color: #065f46;
        border-color: #a7f3d0;
      }

      .icon-warning {
        background: linear-gradient(135deg, #fef3c7, #fde68a);
        color: #92400e;
        border-color: #fde68a;
      }

      .icon-critical {
        background: linear-gradient(135deg, #fee2e2, #fecaca);
        color: #991b1b;
        animation: pulse 2s infinite;
        border-color: #fecaca;
      }

      .icon-offline {
        background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
        color: #4b5563;
        border-color: #e5e7eb;
      }

      .header-info h2 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 700;
        color: #1f2937;
      }

      .device-type {
        margin: 4px 0 0 0;
        font-size: 0.875rem;
        color: #6b7280;
        font-weight: 500;
        text-transform: capitalize;
      }

      .status-chip {
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.5px;
        border: 1px solid transparent;
      }

      .chip-normal {
        background: #d1fae5;
        color: #065f46;
        border-color: #a7f3d0;
      }

      .chip-warning {
        background: #fef3c7;
        color: #92400e;
        border-color: #fde68a;
      }

      .chip-critical {
        background: #fee2e2;
        color: #991b1b;
        border-color: #fecaca;
      }

      .chip-offline {
        background: #f3f4f6;
        color: #4b5563;
        border-color: #e5e7eb;
      }

      .kpi-section {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
      }

      .kpi-card {
        background: white;
        border-radius: 16px;
        padding: 20px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
        display: flex;
        align-items: center;
        gap: 16px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .kpi-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 24px rgba(102, 126, 234, 0.12);
      }

      .kpi-card.primary {
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        grid-column: 1 / -1;
      }

      .kpi-icon {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .kpi-card.primary .kpi-icon {
        background: rgba(255, 255, 255, 0.25);
      }

      .kpi-icon mat-icon {
        color: white;
      }

      .kpi-icon.secondary {
        background: linear-gradient(135deg, #667eea, #764ba2);
      }

      .kpi-icon.tertiary {
        background: linear-gradient(135deg, #f59e0b, #ef4444);
      }

      .kpi-content {
        display: flex;
        flex-direction: column;
        gap: 4px;
        flex: 1;
      }

      .kpi-label {
        font-size: 0.75rem;
        font-weight: 600;
        opacity: 0.9;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .kpi-card.primary .kpi-label {
        color: rgba(255, 255, 255, 0.9);
      }

      .kpi-card:not(.primary) .kpi-label {
        color: #6b7280;
      }

      .kpi-value-row {
        display: flex;
        align-items: baseline;
        gap: 8px;
      }

      .kpi-value {
        font-size: 2rem;
        font-weight: 700;
        line-height: 1;
      }

      .kpi-unit {
        font-size: 1rem;
        font-weight: 600;
        opacity: 0.8;
      }

      .kpi-text {
        font-size: 0.9375rem;
        font-weight: 600;
        color: #1f2937;
      }

      .kpi-delta {
        display: flex;
        align-items: center;
        gap: 2px;
        font-size: 0.875rem;
        font-weight: 600;
        padding: 4px 8px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.2);
      }

      .kpi-delta mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      .kpi-delta.positive {
        color: #10b981;
      }

      .kpi-delta.negative {
        color: #ef4444;
      }

      .threshold-section {
        background: white;
        border-radius: 16px;
        padding: 20px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
      }

      .threshold-header,
      .chart-header {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 700;
        font-size: 1rem;
        color: #1f2937;
        margin-bottom: 16px;
      }

      .threshold-header mat-icon,
      .chart-header mat-icon {
        color: #667eea;
      }

      .threshold-bar {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .bar-track {
        position: relative;
        height: 12px;
        background: linear-gradient(to right, #fee2e2, #fef3c7, #d1fae5, #fef3c7, #fee2e2);
        border-radius: 6px;
        overflow: visible;
      }

      .optimal-zone {
        position: absolute;
        height: 100%;
        background: linear-gradient(135deg, #10b981, #34d399);
        border-radius: 6px;
        box-shadow: 0 0 12px rgba(16, 185, 129, 0.4);
      }

      .current-marker {
        position: absolute;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 20px;
        height: 20px;
        background: linear-gradient(135deg, #667eea, #764ba2);
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        cursor: pointer;
        z-index: 10;
      }

      .marker-pulse {
        position: absolute;
        inset: -4px;
        border: 2px solid #667eea;
        border-radius: 50%;
        animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }

      @keyframes pulse-ring {
        0% {
          transform: scale(1);
          opacity: 1;
        }
        100% {
          transform: scale(1.5);
          opacity: 0;
        }
      }

      .threshold-labels {
        display: flex;
        justify-content: space-between;
        font-size: 0.75rem;
        color: #6b7280;
        font-weight: 600;
      }

      .chart-section {
        background: white;
        border-radius: 16px;
        padding: 20px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
        flex: 1;
        min-height: 300px;
      }

      .chart-container {
        height: 300px;
      }

      .no-chart-data {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 200px;
        color: #9ca3af;
      }

      .no-chart-data mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        margin-bottom: 12px;
        opacity: 0.5;
      }

      .empty-detail {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 60px 20px;
      }

      .empty-icon {
        width: 120px;
        height: 120px;
        border-radius: 50%;
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 24px;
        animation: float 3s ease-in-out infinite;
      }

      @keyframes float {
        0%,
        100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-10px);
        }
      }

      .empty-icon mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        color: #667eea;
      }

      .empty-detail h3 {
        margin: 0 0 8px 0;
        font-size: 1.5rem;
        font-weight: 700;
        color: #1f2937;
      }

      .empty-detail p {
        margin: 0;
        font-size: 1rem;
        color: #6b7280;
        max-width: 400px;
      }

      @media (max-width: 768px) {
        .detail-panel {
          padding: 16px;
          gap: 16px;
        }

        .kpi-section {
          grid-template-columns: 1fr;
        }

        .kpi-card.primary {
          grid-column: 1;
        }

        .chart-container {
          height: 250px;
        }
      }

      /* ========================================
         🌙 DARK THEME STYLES
      ======================================== */
      :host-context(body.dark-theme) .detail-panel {
        background: linear-gradient(
          to bottom,
          rgba(15, 23, 42, 0.75),
          rgba(30, 41, 59, 0.7)
        );
        backdrop-filter: blur(16px);
        border-color: rgba(100, 116, 139, 0.4);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5),
                    inset 0 1px 1px rgba(100, 116, 139, 0.25);
      }

      :host-context(body.dark-theme) .detail-panel::before {
        background: linear-gradient(
          90deg,
          rgba(16, 185, 129, 0.5),
          rgba(52, 211, 153, 0.4),
          rgba(16, 185, 129, 0.5)
        );
      }

      :host-context(body.dark-theme) .detail-header {
        background: rgba(30, 41, 59, 0.6) !important;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
      }

      :host-context(body.dark-theme) .detail-header.status-critical {
        border-left-color: #f87171;
        background: linear-gradient(to right, rgba(239, 68, 68, 0.15), rgba(30, 41, 59, 0.6)) !important;
      }

      :host-context(body.dark-theme) .detail-header.status-warning {
        border-left-color: #fbbf24;
        background: linear-gradient(to right, rgba(245, 158, 11, 0.15), rgba(30, 41, 59, 0.6)) !important;
      }

      :host-context(body.dark-theme) .detail-header.status-normal {
        border-left-color: #34d399;
        background: linear-gradient(to right, rgba(16, 185, 129, 0.15), rgba(30, 41, 59, 0.6)) !important;
      }

      :host-context(body.dark-theme) .detail-header.status-offline {
        border-left-color: #9ca3af;
        background: linear-gradient(to right, rgba(107, 114, 128, 0.15), rgba(30, 41, 59, 0.6)) !important;
      }

      :host-context(body.dark-theme) .header-info h2 {
        color: #ffffff;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
      }

      :host-context(body.dark-theme) .device-type {
        color: #cbd5e1;
      }

      :host-context(body.dark-theme) .icon-normal {
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(167, 243, 208, 0.2));
        color: #6ee7b7;
        border: 1px solid rgba(16, 185, 129, 0.4);
      }

      :host-context(body.dark-theme) .icon-warning {
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.3), rgba(253, 230, 138, 0.2));
        color: #fcd34d;
        border: 1px solid rgba(245, 158, 11, 0.4);
      }

      :host-context(body.dark-theme) .icon-critical {
        background: linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(254, 202, 202, 0.2));
        color: #fca5a5;
        border: 1px solid rgba(239, 68, 68, 0.4);
      }

      :host-context(body.dark-theme) .icon-offline {
        background: linear-gradient(135deg, rgba(107, 114, 128, 0.3), rgba(229, 231, 235, 0.15));
        color: #cbd5e1;
        border: 1px solid rgba(107, 114, 128, 0.4);
      }

      :host-context(body.dark-theme) .chip-normal {
        background: rgba(16, 185, 129, 0.25);
        color: #6ee7b7;
        border-color: rgba(16, 185, 129, 0.4);
      }

      :host-context(body.dark-theme) .chip-warning {
        background: rgba(245, 158, 11, 0.25);
        color: #fcd34d;
        border-color: rgba(245, 158, 11, 0.4);
      }

      :host-context(body.dark-theme) .chip-critical {
        background: rgba(239, 68, 68, 0.25);
        color: #fca5a5;
        border-color: rgba(239, 68, 68, 0.4);
      }

      :host-context(body.dark-theme) .chip-offline {
        background: rgba(107, 114, 128, 0.25);
        color: #cbd5e1;
        border-color: rgba(107, 114, 128, 0.4);
      }

      :host-context(body.dark-theme) .kpi-card {
        background: rgba(30, 41, 59, 0.7);
        border-color: rgba(100, 116, 139, 0.3);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3),
                    inset 0 1px 1px rgba(100, 116, 139, 0.15);
      }

      :host-context(body.dark-theme) .kpi-card:hover {
        background: rgba(30, 41, 59, 0.85);
        border-color: rgba(52, 211, 153, 0.5);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4),
                    0 0 32px rgba(16, 185, 129, 0.15),
                    inset 0 1px 1px rgba(52, 211, 153, 0.25);
      }

      :host-context(body.dark-theme) .kpi-card.primary {
        background: linear-gradient(
          135deg,
          rgba(16, 185, 129, 0.2),
          rgba(5, 150, 105, 0.15)
        );
        border-color: rgba(16, 185, 129, 0.5);
      }

      :host-context(body.dark-theme) .kpi-card.primary:hover {
        background: linear-gradient(
          135deg,
          rgba(16, 185, 129, 0.3),
          rgba(5, 150, 105, 0.25)
        );
        box-shadow: 0 8px 24px rgba(16, 185, 129, 0.2),
                    0 0 32px rgba(16, 185, 129, 0.15),
                    inset 0 1px 1px rgba(52, 211, 153, 0.3);
      }

      :host-context(body.dark-theme) .kpi-label {
        color: #cbd5e1;
      }

      :host-context(body.dark-theme) .kpi-value {
        color: #ffffff;
        text-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
      }

      :host-context(body.dark-theme) .kpi-unit {
        color: #94a3b8;
      }

      :host-context(body.dark-theme) .kpi-text {
        color: #e2e8f0;
      }

      :host-context(body.dark-theme) .threshold-section {
        background: rgba(30, 41, 59, 0.7);
        border-color: rgba(100, 116, 139, 0.3);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3),
                    inset 0 1px 1px rgba(100, 116, 139, 0.15);
      }

      :host-context(body.dark-theme) .threshold-section:hover {
        background: rgba(30, 41, 59, 0.85);
        border-color: rgba(52, 211, 153, 0.4);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4),
                    0 0 24px rgba(16, 185, 129, 0.1),
                    inset 0 1px 1px rgba(52, 211, 153, 0.2);
      }

      :host-context(body.dark-theme) .threshold-header {
        color: #f1f5f9;
      }

      :host-context(body.dark-theme) .threshold-labels {
        color: #cbd5e1;
      }

      :host-context(body.dark-theme) .chart-section {
        background: rgba(30, 41, 59, 0.7);
        border-color: rgba(100, 116, 139, 0.3);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3),
                    inset 0 1px 1px rgba(100, 116, 139, 0.15);
      }

      :host-context(body.dark-theme) .chart-section:hover {
        background: rgba(30, 41, 59, 0.85);
        border-color: rgba(52, 211, 153, 0.4);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4),
                    0 0 24px rgba(16, 185, 129, 0.1),
                    inset 0 1px 1px rgba(52, 211, 153, 0.2);
      }

      :host-context(body.dark-theme) .chart-header {
        color: #f1f5f9;
      }

      :host-context(body.dark-theme) .empty-detail {
        color: #cbd5e1;
      }

      :host-context(body.dark-theme) .empty-detail h3 {
        color: #f1f5f9;
      }

      :host-context(body.dark-theme) .empty-detail p {
        color: #94a3b8;
      }
    `,
  ],
})
export class DeviceDetailPanelComponent {
  // Inputs
  device = input<DeviceDetail | null>(null);
  loading = input<boolean>(false);

  // Chart config
  colorScheme: any = {
    domain: ['#667eea', '#764ba2', '#f59e0b'],
  };
  curveFunction: any = null; // Will use default curve

  // Computed chart data in ngx-charts format
  chartSeriesData = computed(() => {
    const dev = this.device();
    if (!dev || !dev.chartData || dev.chartData.length === 0) return [];
    return [
      {
        name: dev.name,
        series: dev.chartData,
      },
    ];
  });

  getStatusIcon(status: SensorStatus): string {
    const icons: Record<SensorStatus, string> = {
      normal: 'check_circle',
      warning: 'warning',
      critical: 'error',
      offline: 'sensors_off',
    };
    return icons[status];
  }

  formatDateTime(date: Date | null): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  }

  getPosition(value: number): number {
    const dev = this.device();
    if (!dev) return 0;
    const { min, max } = dev.thresholds;
    if (max === min) return 0;
    return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  }

  getWidth(start: number, end: number): number {
    const dev = this.device();
    if (!dev) return 0;
    const { min, max } = dev.thresholds;
    if (max === min) return 0;
    return Math.max(0, Math.min(100, ((end - start) / (max - min)) * 100));
  }
}

