import { Component, OnInit, inject, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTabsModule } from '@angular/material/tabs';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatMenuModule } from '@angular/material/menu';
import { MatListModule } from '@angular/material/list';
import { MatStepperModule } from '@angular/material/stepper';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatGridListModule } from '@angular/material/grid-list';

import { ApiService } from '../../../../core/services/api.service';
import { Device, Farm } from '../../../../core/models/farm.model';
import { ExecuteActionRequest } from '../../../../core/models/action-log.model';
import { ActionConfirmationDialogComponent } from './action-confirmation-dialog/action-confirmation-dialog.component';
import { NotificationService } from '../../../../core/services/notification.service';
import { Subject, interval, takeUntil } from 'rxjs';

interface ActionTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  actionUri: string;
  category: 'irrigation' | 'ventilation' | 'heating' | 'lighting' | 'security' | 'maintenance';
  requiresConfirmation: boolean;
  estimatedDuration?: string;
  actionType: 'critical' | 'important' | 'normal';
  qosLevel: 0 | 1 | 2;
  retainFlag: boolean;
  maxRetries: number;
}

interface DeviceActions {
  device: Device;
  availableActions: ActionTemplate[];
  status: 'online' | 'offline' | 'maintenance';
  lastSeen?: Date;
  batteryLevel?: number;
  signalStrength?: number;
}

interface ActionStatus {
  actionId: string;
  deviceId: string;
  action: string;
  status: 'queued' | 'sent' | 'ack' | 'failed' | 'timeout';
  timestamp: Date;
  executionTime?: number;
  error?: string;
}

interface PendingAction {
  actionId: string;
  deviceId: string;
  actionName: string;
  actionUri: string;
  status: 'sent' | 'ack' | 'failed' | 'timeout';
  timestamp: Date;
  timeoutAt?: Date;
  executionTime?: number;
  error?: string;
}

@Component({
  selector: 'app-manual-actions',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatExpansionModule,
    MatTabsModule,
    MatBadgeModule,
    MatDividerModule,
    MatSlideToggleModule,
    MatMenuModule,
    MatListModule,
    MatStepperModule,
    MatProgressBarModule,
    MatChipsModule,
    MatGridListModule,
  ],
  template: `
    <div class="manual-actions-container">
      <!-- Header Section -->
      <div class="actions-header">
        <div class="header-content">
          <div class="header-title">
            <mat-icon class="header-icon">smart_toy</mat-icon>
            <h1>Device Control Center</h1>
            <p>Manage and monitor your farm devices with real-time feedback</p>
          </div>
          <div class="header-actions">
            <button mat-icon-button (click)="refreshDevices()" [disabled]="isLoading()" matTooltip="Refresh Devices">
              <mat-icon>refresh</mat-icon>
            </button>
            <button mat-icon-button (click)="toggleAutoRefresh()" matTooltip="Auto Refresh">
              <mat-icon [class.active]="autoRefreshEnabled()">{{ autoRefreshEnabled() ? 'pause' : 'play_arrow' }}</mat-icon>
            </button>
          </div>
        </div>
        
        <!-- Quick Stats -->
        <div class="quick-stats" *ngIf="!isLoading()">
          <div class="stat-item">
            <mat-icon>devices</mat-icon>
            <div class="stat-content">
              <span class="stat-number">{{ deviceActions().length }}</span>
              <span class="stat-label">Devices</span>
            </div>
          </div>
          <div class="stat-item">
            <mat-icon>check_circle</mat-icon>
            <div class="stat-content">
              <span class="stat-number">{{ onlineDevicesCount() }}</span>
              <span class="stat-label">Online</span>
            </div>
          </div>
          <div class="stat-item">
            <mat-icon>schedule</mat-icon>
            <div class="stat-content">
              <span class="stat-number">{{ activeActionsCount() }}</span>
              <span class="stat-label">Pending Actions</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Pending Actions Section -->
      <div class="pending-actions-section" *ngIf="activeActionsCount() > 0">
        <mat-card class="pending-actions-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>schedule</mat-icon>
              Pending Actions ({{ activeActionsCount() }})
            </mat-card-title>
            <mat-card-subtitle>Waiting for device confirmation</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="pending-actions-list">
              <div *ngFor="let pendingAction of pendingActionsArray()" class="pending-action-item">
                <div class="action-info">
                  <mat-icon class="action-icon">{{ getActionIconFromUri(pendingAction.actionUri) }}</mat-icon>
                  <div class="action-details">
                    <h4>{{ pendingAction.actionName }}</h4>
                    <p>{{ pendingAction.deviceId }} • {{ pendingAction.timestamp | date:'short' }}</p>
                  </div>
                </div>
                <div class="action-status">
                  <mat-spinner diameter="24" *ngIf="pendingAction.status === 'sent'"></mat-spinner>
                  <mat-icon *ngIf="pendingAction.status === 'ack'" class="status-success">check_circle</mat-icon>
                  <mat-icon *ngIf="pendingAction.status === 'failed'" class="status-error">error</mat-icon>
                  <mat-icon *ngIf="pendingAction.status === 'timeout'" class="status-warning">schedule</mat-icon>
                  <mat-chip [color]="getPendingStatusColor(pendingAction.status)">
                    {{ pendingAction.status | titlecase }}
                  </mat-chip>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Main Content -->
      <mat-tab-group class="actions-tabs" *ngIf="!isLoading() && deviceActions().length > 0">
        <!-- Device Control Tab -->
        <mat-tab label="Device Control">
          <div class="devices-grid">
            <mat-card *ngFor="let deviceAction of deviceActions()" class="device-card" [ngClass]="getDeviceCardClass(deviceAction)">
              <!-- Device Header -->
              <mat-card-header class="device-card-header">
                <div class="device-info">
                  <div class="device-status">
                    <mat-icon [ngClass]="getDeviceStatusClass(deviceAction.device.status)">
                      {{ getDeviceIcon(deviceAction.device.status) }}
                    </mat-icon>
                    <mat-chip [color]="getStatusColor(deviceAction.device.status)" selected>
                      {{ deviceAction.device.status | titlecase }}
                    </mat-chip>
                    <mat-chip *ngIf="!isDeviceClickable(deviceAction)" color="warn">
                      Actions Disabled
                    </mat-chip>
                  </div>
                  <div class="device-details">
                    <h3>{{ deviceAction.device.name }}</h3>
                    <p>{{ deviceAction.device.location }}</p>
                    <div class="device-meta" *ngIf="deviceAction.lastSeen">
                      <span>Last seen: {{ deviceAction.lastSeen | date:'short' }}</span>
                    </div>
                  </div>
                </div>
                <div class="device-health" *ngIf="deviceAction.batteryLevel !== undefined">
                  <mat-icon>battery_std</mat-icon>
                  <span>{{ deviceAction.batteryLevel }}%</span>
                </div>
              </mat-card-header>

              <!-- Action Categories -->
              <mat-card-content class="device-actions">
                <div *ngFor="let category of getActionCategories(deviceAction.availableActions)" class="action-category">
                  <div class="category-header">
                    <mat-icon class="category-icon">{{ getCategoryIcon(category) }}</mat-icon>
                    <h4>{{ category | titlecase }}</h4>
                    <mat-chip [color]="'primary'">
                      {{ getActionsByCategory(deviceAction.availableActions, category).length }} actions
                    </mat-chip>
                  </div>
                  
                  <div class="action-grid">
                    <button
                      *ngFor="let action of getActionsByCategory(deviceAction.availableActions, category)"
                      mat-raised-button
                      [color]="getActionColor(action.category)"
                      [disabled]="isActionExecuting(action.id) || !isDeviceClickable(deviceAction)"
                      (click)="executeAction(deviceAction.device, action)"
                      class="action-button"
                      [matTooltip]="getActionTooltip(action)">
                      <div class="action-content">
                        <mat-icon *ngIf="!isActionExecuting(action.id)">{{ action.icon }}</mat-icon>
                        <mat-spinner *ngIf="isActionExecuting(action.id)" diameter="20"></mat-spinner>
                        <span class="action-name">{{ action.name }}</span>
                        <div class="action-badges">
                          <mat-icon *ngIf="action.requiresConfirmation" class="confirmation-icon" matTooltip="Requires Confirmation">warning</mat-icon>
                          <mat-chip *ngIf="action.actionType !== 'normal'" [color]="getActionTypeColor(action.actionType)" class="action-type-chip">
                            {{ action.actionType | titlecase }}
                          </mat-chip>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <!-- Action History Tab -->
        <mat-tab label="Action History">
          <div class="action-history">
            <div class="history-header">
              <h3>Recent Actions</h3>
              <div class="history-filters">
                <mat-form-field appearance="outline">
                  <mat-label>Filter by Status</mat-label>
                  <mat-select [(value)]="selectedStatusFilter" (selectionChange)="filterActions()">
                    <mat-option value="all">All Actions</mat-option>
                    <mat-option value="ack">Successful</mat-option>
                    <mat-option value="failed">Failed</mat-option>
                    <mat-option value="timeout">Timeout</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>
            </div>
            
            <div class="action-list">
              <mat-list>
                <mat-list-item *ngFor="let action of filteredActions()" class="action-item">
                  <mat-icon matListItemIcon [ngClass]="getActionStatusClass(action.status)">
                    {{ getActionStatusIcon(action.status) }}
                  </mat-icon>
                  <div matListItemTitle>{{ action.action | titlecase }}</div>
                  <div matListItemLine>{{ action.deviceId }} • {{ action.timestamp | date:'short' }}</div>
                  <div matListItemMeta>
                    <mat-chip [color]="getActionStatusColor(action.status)">
                      {{ action.status | titlecase }}
                    </mat-chip>
                  </div>
                </mat-list-item>
              </mat-list>
            </div>
          </div>
        </mat-tab>

        <!-- Device Health Tab -->
        <mat-tab label="Device Health">
          <div class="device-health-dashboard">
            <div class="health-grid">
              <mat-card *ngFor="let deviceAction of deviceActions()" class="health-card">
                <mat-card-header>
                  <mat-card-title>{{ deviceAction.device.name }}</mat-card-title>
                  <mat-card-subtitle>{{ deviceAction.device.location }}</mat-card-subtitle>
                </mat-card-header>
                <mat-card-content>
                  <div class="health-metrics">
                    <div class="metric">
                      <mat-icon>wifi</mat-icon>
                      <span>Signal: {{ deviceAction.signalStrength || 'N/A' }} dBm</span>
                    </div>
                    <div class="metric" *ngIf="deviceAction.batteryLevel !== undefined">
                      <mat-icon>battery_std</mat-icon>
                      <span>Battery: {{ deviceAction.batteryLevel }}%</span>
                      <mat-progress-bar mode="determinate" [value]="deviceAction.batteryLevel"></mat-progress-bar>
                    </div>
                    <div class="metric">
                      <mat-icon>schedule</mat-icon>
                      <span>Last Seen: {{ deviceAction.lastSeen | date:'short' }}</span>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="loading-container">
        <mat-spinner diameter="60"></mat-spinner>
        <h3>Loading Devices...</h3>
        <p>Connecting to your farm devices</p>
      </div>

      <!-- No Devices State -->
      <div *ngIf="!isLoading() && deviceActions().length === 0" class="no-devices">
        <mat-icon>devices_other</mat-icon>
        <h3>No Devices Available</h3>
        <p>No devices found with available actions. Make sure your devices are online and properly configured.</p>
        <button mat-raised-button color="primary" (click)="refreshDevices()">
          <mat-icon>refresh</mat-icon>
          Refresh Devices
        </button>
      </div>
    </div>
  `,
  styles: [`
    .manual-actions-container {
      padding: 24px;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      min-height: 100vh;
    }

    /* Header Section */
    .actions-header {
      background: white;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
    }

    .header-title {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .header-title h1 {
      margin: 0;
      font-size: 2rem;
      font-weight: 700;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-icon {
      font-size: 2rem;
      color: #4caf50;
    }

    .header-title p {
      margin: 0;
      color: #666;
      font-size: 1.1rem;
    }

    .header-actions {
      display: flex;
      gap: 8px;
    }

    .header-actions mat-icon.active {
      color: #4caf50;
    }

    /* Quick Stats */
    .quick-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      color: white;
    }

    .stat-item mat-icon {
      font-size: 2rem;
      opacity: 0.9;
    }

    .stat-content {
      display: flex;
      flex-direction: column;
    }

    .stat-number {
      font-size: 1.8rem;
      font-weight: 700;
      line-height: 1;
    }

    .stat-label {
      font-size: 0.9rem;
      opacity: 0.9;
    }

    /* Tabs */
    .actions-tabs {
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      overflow: hidden;
    }

    /* Device Grid */
    .devices-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 24px;
      padding: 24px;
    }

    .device-card {
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      transition: all 0.3s ease;
      border: 2px solid transparent;
    }

    .device-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 30px rgba(0,0,0,0.12);
    }

    .device-card-online {
      border-color: #4caf50;
    }

    .device-card-offline {
      border-color: #f44336;
      opacity: 0.7;
    }

    .device-card-maintenance {
      border-color: #ff9800;
    }

    .device-card-header {
      padding: 20px 20px 16px 20px;
      border-bottom: 1px solid #f0f0f0;
    }

    .device-info {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .device-status {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .device-status mat-icon {
      font-size: 2rem;
    }

    .device-details {
      flex: 1;
    }

    .device-details h3 {
      margin: 0 0 4px 0;
      font-size: 1.2rem;
      font-weight: 600;
      color: #2c3e50;
    }

    .device-details p {
      margin: 0 0 8px 0;
      color: #666;
      font-size: 0.9rem;
    }

    .device-meta {
      font-size: 0.8rem;
      color: #999;
    }

    .device-health {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #f8f9fa;
      border-radius: 8px;
      font-size: 0.9rem;
    }

    /* Action Categories */
    .device-actions {
      padding: 20px;
    }

    .action-category {
      margin-bottom: 24px;
    }

    .category-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #f0f0f0;
    }

    .category-icon {
      font-size: 1.5rem;
      color: #4caf50;
    }

    .category-header h4 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
      color: #2c3e50;
      flex: 1;
    }

    .action-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 12px;
    }

    .action-button {
      position: relative;
      height: 60px;
      border-radius: 12px;
      transition: all 0.3s ease;
    }

    .action-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(0,0,0,0.15);
    }

    .action-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      height: 100%;
      justify-content: center;
    }

    .action-name {
      font-size: 0.9rem;
      font-weight: 500;
    }

    .action-badges {
      display: flex;
      gap: 4px;
      align-items: center;
    }

    .confirmation-icon {
      font-size: 16px;
      color: #ff9800;
    }

    .action-type-chip {
      font-size: 10px;
      height: 18px;
      min-height: 18px;
    }

    /* Action History */
    .action-history {
      padding: 24px;
    }

    .history-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .history-header h3 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
      color: #2c3e50;
    }

    .history-filters {
      min-width: 200px;
    }

    .action-item {
      border-bottom: 1px solid #f0f0f0;
    }

    .action-item:last-child {
      border-bottom: none;
    }

    /* Device Health Dashboard */
    .device-health-dashboard {
      padding: 24px;
    }

    .health-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }

    .health-card {
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.08);
    }

    .health-metrics {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .metric {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .metric mat-icon {
      color: #4caf50;
    }

    .metric span {
      font-size: 0.9rem;
      color: #666;
    }

    /* Loading State */
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 20px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    }

    .loading-container h3 {
      margin: 16px 0 8px 0;
      color: #2c3e50;
    }

    .loading-container p {
      margin: 0;
      color: #666;
    }

    /* No Devices State */
    .no-devices {
      text-align: center;
      padding: 80px 20px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    }

    .no-devices mat-icon {
      font-size: 80px;
      width: 80px;
      height: 80px;
      margin-bottom: 24px;
      opacity: 0.3;
      color: #666;
    }

    .no-devices h3 {
      margin-bottom: 12px;
      color: #2c3e50;
      font-size: 1.5rem;
    }

    .no-devices p {
      margin-bottom: 32px;
      max-width: 500px;
      margin-left: auto;
      margin-right: auto;
      color: #666;
      line-height: 1.6;
    }

    /* Status Colors */
    .status-online { color: #4caf50; }
    .status-offline { color: #f44336; }
    .status-maintenance { color: #ff9800; }

    .action-status-queued { color: #ff9800; }
    .action-status-sent { color: #2196f3; }
    .action-status-ack { color: #4caf50; }
    .action-status-failed { color: #f44336; }
    .action-status-timeout { color: #ff9800; }

    /* Pending Actions Section */
    .pending-actions-section {
      margin-bottom: 24px;
    }

    .pending-actions-card {
      background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      border: 2px solid #ff9800;
    }

    .pending-actions-card .mat-card-header {
      padding-bottom: 16px;
      border-bottom: 1px solid #ffcc80;
    }

    .pending-actions-card .mat-card-title {
      display: flex;
      align-items: center;
      gap: 12px;
      color: #e65100;
      font-weight: 600;
    }

    .pending-actions-card .mat-card-subtitle {
      color: #bf360c;
      font-weight: 500;
    }

    .pending-actions-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .pending-action-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border-left: 4px solid #ff9800;
    }

    .action-info {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .action-icon {
      font-size: 2rem;
      color: #ff9800;
    }

    .action-details h4 {
      margin: 0 0 4px 0;
      font-size: 1.1rem;
      font-weight: 600;
      color: #2c3e50;
    }

    .action-details p {
      margin: 0;
      font-size: 0.9rem;
      color: #666;
    }

    .action-status {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .status-success {
      color: #4caf50;
    }

    .status-error {
      color: #f44336;
    }

    .status-warning {
      color: #ff9800;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .manual-actions-container {
        padding: 16px;
      }

      .devices-grid {
        grid-template-columns: 1fr;
        padding: 16px;
      }

      .header-content {
        flex-direction: column;
        gap: 16px;
      }

      .quick-stats {
        grid-template-columns: 1fr;
      }

      .action-grid {
        grid-template-columns: 1fr;
      }

      .health-grid {
        grid-template-columns: 1fr;
      }

      .pending-action-item {
        flex-direction: column;
        gap: 12px;
        text-align: center;
      }

      .action-info {
        flex-direction: column;
        gap: 8px;
      }
    }
  `]
})
export class ManualActionsComponent implements OnInit, OnDestroy {
  private apiService = inject(ApiService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private notificationService = inject(NotificationService);
  private destroy$ = new Subject<void>();

  // Signals
  isLoading = signal(false);
  devices = signal<Device[]>([]);
  farms = signal<Farm[]>([]);
  executingActions = signal<Set<string>>(new Set());
  pendingActions = signal<Map<string, PendingAction>>(new Map());
  autoRefreshEnabled = signal(false);
  selectedStatusFilter = signal('all');
  actionHistory = signal<ActionStatus[]>([]);

  // Computed properties
  deviceActions = computed(() => {
    return this.devices().map(device => ({
      device,
      availableActions: this.getAvailableActionsForDevice(device),
      status: device.status as 'online' | 'offline' | 'maintenance',
      lastSeen: device.last_seen ? new Date(device.last_seen) : undefined,
      batteryLevel: Math.floor(Math.random() * 100), // Mock data - replace with real data
      signalStrength: Math.floor(Math.random() * 100) - 100 // Mock data - replace with real data
    })).filter(da => da.availableActions.length > 0);
  });

  onlineDevicesCount = computed(() => {
    return this.deviceActions().filter(da => da.device.status === 'online').length;
  });

  activeActionsCount = computed(() => {
    return this.pendingActions().size;
  });

  // Convert Map to Array for template usage (fixes change detection issues)
  pendingActionsArray = computed(() => Array.from(this.pendingActions().values()));

  filteredActions = computed(() => {
    const filter = this.selectedStatusFilter();
    if (filter === 'all') {
      return this.actionHistory();
    }
    return this.actionHistory().filter(action => action.status === filter);
  });

  // Action templates with production-ready settings
  private actionTemplates: ActionTemplate[] = [
    // Irrigation - Critical Actions
    {
      id: 'irrigation_on',
      name: 'Start Irrigation',
      description: 'Turn on irrigation system',
      icon: 'water_drop',
      actionUri: 'mqtt:smartfarm/actuators/{device_id}/irrigation_on',
      category: 'irrigation',
      requiresConfirmation: true,
      estimatedDuration: '30-60 min',
      actionType: 'critical',
      qosLevel: 2,
      retainFlag: true,
      maxRetries: 3
    },
    {
      id: 'irrigation_off',
      name: 'Stop Irrigation',
      description: 'Turn off irrigation system',
      icon: 'water_drop_off',
      actionUri: 'mqtt:smartfarm/actuators/{device_id}/irrigation_off',
      category: 'irrigation',
      requiresConfirmation: false,
      actionType: 'important',
      qosLevel: 1,
      retainFlag: false,
      maxRetries: 2
    },
    
    // Ventilation - Mixed Criticality
    {
      id: 'fan_on',
      name: 'Turn On Fan',
      description: 'Activate ventilation fan',
      icon: 'air',
      actionUri: 'mqtt:smartfarm/actuators/{device_id}/fan_on',
      category: 'ventilation',
      requiresConfirmation: false,
      actionType: 'important',
      qosLevel: 1,
      retainFlag: false,
      maxRetries: 2
    },
    {
      id: 'fan_off',
      name: 'Turn Off Fan',
      description: 'Deactivate ventilation fan',
      icon: 'air',
      actionUri: 'mqtt:smartfarm/actuators/{device_id}/fan_off',
      category: 'ventilation',
      requiresConfirmation: false,
      actionType: 'normal',
      qosLevel: 1,
      retainFlag: false,
      maxRetries: 1
    },
    {
      id: 'open_roof',
      name: 'Open Roof',
      description: 'Open greenhouse roof for ventilation',
      icon: 'open_in_full',
      actionUri: 'mqtt:smartfarm/actuators/{device_id}/open_roof',
      category: 'ventilation',
      requiresConfirmation: true,
      estimatedDuration: '5-10 min',
      actionType: 'critical',
      qosLevel: 2,
      retainFlag: true,
      maxRetries: 3
    },
    {
      id: 'close_roof',
      name: 'Close Roof',
      description: 'Close greenhouse roof',
      icon: 'close_fullscreen',
      actionUri: 'mqtt:smartfarm/actuators/{device_id}/close_roof',
      category: 'ventilation',
      requiresConfirmation: true,
      estimatedDuration: '5-10 min',
      actionType: 'critical',
      qosLevel: 2,
      retainFlag: true,
      maxRetries: 3
    },
    
    // Heating - Critical Actions
    {
      id: 'heater_on',
      name: 'Turn On Heater',
      description: 'Activate heating system',
      icon: 'local_fire_department',
      actionUri: 'mqtt:smartfarm/actuators/{device_id}/heater_on',
      category: 'heating',
      requiresConfirmation: true,
      estimatedDuration: 'Until manually turned off',
      actionType: 'critical',
      qosLevel: 2,
      retainFlag: true,
      maxRetries: 3
    },
    {
      id: 'heater_off',
      name: 'Turn Off Heater',
      description: 'Deactivate heating system',
      icon: 'local_fire_department',
      actionUri: 'mqtt:smartfarm/actuators/{device_id}/heater_off',
      category: 'heating',
      requiresConfirmation: false,
      actionType: 'important',
      qosLevel: 1,
      retainFlag: false,
      maxRetries: 2
    },
    
    // Lighting - Normal Actions
    {
      id: 'lights_on',
      name: 'Turn On Lights',
      description: 'Activate grow lights',
      icon: 'lightbulb',
      actionUri: 'mqtt:smartfarm/actuators/{device_id}/lights_on',
      category: 'lighting',
      requiresConfirmation: false,
      actionType: 'normal',
      qosLevel: 1,
      retainFlag: false,
      maxRetries: 1
    },
    {
      id: 'lights_off',
      name: 'Turn Off Lights',
      description: 'Deactivate grow lights',
      icon: 'lightbulb_outline',
      actionUri: 'mqtt:smartfarm/actuators/{device_id}/lights_off',
      category: 'lighting',
      requiresConfirmation: false,
      actionType: 'normal',
      qosLevel: 1,
      retainFlag: false,
      maxRetries: 1
    },
    
    // Security - Critical Actions
    {
      id: 'alarm_on',
      name: 'Enable Alarm',
      description: 'Activate security alarm',
      icon: 'security',
      actionUri: 'mqtt:smartfarm/actuators/{device_id}/alarm_on',
      category: 'security',
      requiresConfirmation: true,
      actionType: 'critical',
      qosLevel: 2,
      retainFlag: true,
      maxRetries: 3
    },
    {
      id: 'alarm_off',
      name: 'Disable Alarm',
      description: 'Deactivate security alarm',
      icon: 'security',
      actionUri: 'mqtt:smartfarm/actuators/{device_id}/alarm_off',
      category: 'security',
      requiresConfirmation: false,
      actionType: 'important',
      qosLevel: 1,
      retainFlag: false,
      maxRetries: 2
    },
    
    // Maintenance - Critical Actions
    {
      id: 'restart_device',
      name: 'Restart Device',
      description: 'Restart the device',
      icon: 'restart_alt',
      actionUri: 'mqtt:smartfarm/actuators/{device_id}/restart',
      category: 'maintenance',
      requiresConfirmation: true,
      estimatedDuration: '2-5 min',
      actionType: 'critical',
      qosLevel: 2,
      retainFlag: true,
      maxRetries: 3
    },
    {
      id: 'calibrate_sensors',
      name: 'Calibrate Sensors',
      description: 'Run sensor calibration',
      icon: 'tune',
      actionUri: 'mqtt:smartfarm/actuators/{device_id}/calibrate',
      category: 'maintenance',
      requiresConfirmation: true,
      estimatedDuration: '10-15 min',
      actionType: 'important',
      qosLevel: 1,
      retainFlag: false,
      maxRetries: 2
    }
  ];

  ngOnInit(): void {
    this.loadData();
    this.loadPendingActionsFromStorage();
    this.loadActionHistoryFromStorage();
    this.setupWebSocketListeners();
  }

  async loadData(): Promise<void> {
    this.isLoading.set(true);
    try {
      const [farms, devices] = await Promise.all([
        this.apiService.getFarms().toPromise(),
        this.apiService.getDevices(true).toPromise()
      ]);
      
      this.farms.set(farms || []);
      this.devices.set(devices || []);
      
      // Debug: Log device statuses
      console.log('Loaded devices:', devices);
      devices?.forEach(device => {
        console.log(`Device ${device.name} (${device.device_id}): status = "${device.status}"`);
      });
    } catch (error) {
      console.error('Error loading data:', error);
      this.snackBar.open('Failed to load devices', 'Close', { duration: 3000 });
    } finally {
      this.isLoading.set(false);
    }
  }

  refreshDevices(): void {
    this.loadData();
  }

  getAvailableActionsForDevice(device: Device): ActionTemplate[] {
    // For now, return all actions for all devices
    // In a real implementation, this would be based on device capabilities
    return this.actionTemplates.map(template => ({
      ...template,
      actionUri: template.actionUri.replace('{device_id}', device.device_id)
    }));
  }

  getActionCategories(actions: ActionTemplate[]): string[] {
    const categories = [...new Set(actions.map(a => a.category))];
    return categories.sort();
  }

  getActionsByCategory(actions: ActionTemplate[], category: string): ActionTemplate[] {
    return actions.filter(a => a.category === category);
  }

  getCategoryIcon(category: string): string {
    const icons: { [key: string]: string } = {
      irrigation: 'water_drop',
      ventilation: 'air',
      heating: 'local_fire_department',
      lighting: 'lightbulb',
      security: 'security',
      maintenance: 'build'
    };
    return icons[category] || 'settings';
  }

  getActionColor(category: string): 'primary' | 'accent' | 'warn' {
    const colors: { [key: string]: 'primary' | 'accent' | 'warn' } = {
      irrigation: 'primary',
      ventilation: 'accent',
      heating: 'warn',
      lighting: 'primary',
      security: 'warn',
      maintenance: 'accent'
    };
    return colors[category] || 'primary';
  }

  getActionTypeColor(actionType: string): 'primary' | 'accent' | 'warn' {
    const colors: { [key: string]: 'primary' | 'accent' | 'warn' } = {
      critical: 'warn',
      important: 'accent',
      normal: 'primary'
    };
    return colors[actionType] || 'primary';
  }

  getDeviceStatusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }

  getDeviceIcon(status: string): string {
    const icons: { [key: string]: string } = {
      online: 'wifi',
      offline: 'wifi_off',
      maintenance: 'build'
    };
    return icons[status.toLowerCase()] || 'devices_other';
  }

  getStatusColor(status: string): 'primary' | 'accent' | 'warn' {
    const colors: { [key: string]: 'primary' | 'accent' | 'warn' } = {
      online: 'primary',
      offline: 'warn',
      maintenance: 'accent'
    };
    return colors[status.toLowerCase()] || 'primary';
  }

  isActionExecuting(actionId: string): boolean {
    // Check if action is in executing state OR pending confirmation
    return this.executingActions().has(actionId) || this.isActionPending(actionId);
  }

  isDeviceClickable(deviceAction: DeviceActions): boolean {
    const isOffline = deviceAction.device.status === 'offline';
    console.log(`Device ${deviceAction.device.name} clickable: ${!isOffline} (status: ${deviceAction.device.status})`);
    return !isOffline;
  }

  addPendingAction(actionId: string, deviceId: string, actionName: string, actionUri: string): void {
    const pendingAction: PendingAction = {
      actionId,
      deviceId,
      actionName,
      actionUri,
      status: 'sent',
      timestamp: new Date(),
      timeoutAt: new Date(Date.now() + 30000) // 30 second timeout
    };

    this.pendingActions.update(actions => {
      const newMap = new Map(actions);
      newMap.set(actionId, pendingAction);
      console.log('➕ [MANUAL-ACTIONS] Added pending action:', actionId, 'Total pending:', newMap.size);
      return newMap;
    });

    // Save to localStorage for persistence
    this.savePendingActionsToStorage();

    // Set up timeout
    setTimeout(() => {
      this.handleActionTimeout(actionId);
    }, 30000);
  }

  updatePendingActionStatus(actionId: string, status: 'ack' | 'failed', executionTime?: number, error?: string): void {
    console.log('🔄 [MANUAL-ACTIONS] updatePendingActionStatus called:', { actionId, status, executionTime, error });
    
    // First update the status to show success/failure in the UI
    this.pendingActions.update(actions => {
      const newMap = new Map(actions);
      const pendingAction = newMap.get(actionId);
      console.log('🔍 [MANUAL-ACTIONS] Found pending action:', pendingAction);
      
      if (pendingAction) {
        pendingAction.status = status;
        if (executionTime) {
          pendingAction.executionTime = executionTime;
        }
        if (error) {
          pendingAction.error = error;
        }
        newMap.set(actionId, pendingAction);
        console.log('✅ [MANUAL-ACTIONS] Updated pending action:', pendingAction);
      } else {
        console.warn('⚠️ [MANUAL-ACTIONS] Pending action not found for ID:', actionId);
        console.log('🔍 [MANUAL-ACTIONS] Available action IDs:', Array.from(newMap.keys()));
      }
      return newMap;
    });

    // Save to localStorage
    this.savePendingActionsToStorage();

    // Show the updated status for a moment before moving to history
    setTimeout(() => {
      this.moveToHistory(actionId, status, executionTime, error);
    }, 2000); // Show success/failure state for 2 seconds
  }

  handleActionTimeout(actionId: string): void {
    this.pendingActions.update(actions => {
      const newMap = new Map(actions);
      const pendingAction = newMap.get(actionId);
      if (pendingAction && pendingAction.status === 'sent') {
        pendingAction.status = 'timeout';
        newMap.set(actionId, pendingAction);
      }
      return newMap;
    });

    // Move to history (this will also remove from executing actions)
    this.moveToHistory(actionId, 'timeout');
  }

  moveToHistory(actionId: string, status: 'ack' | 'failed' | 'timeout', executionTime?: number, error?: string): void {
    // Store action name before update
    const pendingActionRef = this.pendingActions().get(actionId);
    const actionName = pendingActionRef?.actionName || 'Unknown Action';
    
    console.log('📋 [MANUAL-ACTIONS] moveToHistory called:', { actionId, status, actionName, pendingActionRef });

    this.pendingActions.update(actions => {
      const newMap = new Map(actions);
      const pendingAction = newMap.get(actionId);
      if (pendingAction) {
        // Add to history
        const historyAction: ActionStatus = {
          actionId: pendingAction.actionId,
          deviceId: pendingAction.deviceId,
          action: pendingAction.actionName,
          status,
          timestamp: pendingAction.timestamp,
          executionTime,
          error
        };

        this.actionHistory.update(history => [historyAction, ...history]);

        // Remove from pending
        newMap.delete(actionId);
      }
      return newMap;
    });

    // Also remove from executing actions to clear the spinner
    this.executingActions.update(actions => {
      const newSet = new Set(actions);
      newSet.delete(actionId);
      return newSet;
    });

    // Save both pending actions and history to localStorage
    this.savePendingActionsToStorage();
    this.saveActionHistoryToStorage();

    // Show appropriate notification based on status
    this.showActionCompletionNotification(status, actionName);
  }

  isActionPending(actionId: string): boolean {
    return this.pendingActions().has(actionId);
  }

  getPendingActionStatus(actionId: string): string {
    const pendingAction = this.pendingActions().get(actionId);
    return pendingAction?.status || 'unknown';
  }

  getPendingStatusColor(status: string): 'primary' | 'accent' | 'warn' {
    const colors: { [key: string]: 'primary' | 'accent' | 'warn' } = {
      sent: 'primary',
      ack: 'accent',
      failed: 'warn',
      timeout: 'warn',
      queued: 'primary'
    };
    return colors[status] || 'primary';
  }

  getActionIconFromUri(actionUri: string): string {
    if (actionUri.includes('fan')) return 'air';
    if (actionUri.includes('irrigation')) return 'water_drop';
    if (actionUri.includes('heater')) return 'local_fire_department';
    if (actionUri.includes('lights')) return 'lightbulb';
    if (actionUri.includes('alarm')) return 'security';
    if (actionUri.includes('roof')) return 'open_in_full';
    if (actionUri.includes('restart')) return 'restart_alt';
    if (actionUri.includes('calibrate')) return 'tune';
    return 'smart_toy';
  }


  // Persistence methods for handling page refresh
  savePendingActionsToStorage(): void {
    const pendingActionsArray = Array.from(this.pendingActions().values());
    localStorage.setItem('smart-farm-pending-actions', JSON.stringify(pendingActionsArray));
  }

  loadPendingActionsFromStorage(): void {
    try {
      const stored = localStorage.getItem('smart-farm-pending-actions');
      if (stored) {
        const pendingActionsArray: PendingAction[] = JSON.parse(stored);
        const pendingMap = new Map<string, PendingAction>();
        
        pendingActionsArray.forEach(action => {
          // Check if action is still within timeout period
          const now = new Date();
          const actionTime = new Date(action.timestamp);
          const timeDiff = now.getTime() - actionTime.getTime();
          
          if (timeDiff < 30000) { // 30 seconds timeout
            // Still valid, add to pending
            pendingMap.set(action.actionId, action);
            
            // Set up timeout for remaining time
            const remainingTime = 30000 - timeDiff;
            setTimeout(() => {
              this.handleActionTimeout(action.actionId);
            }, remainingTime);
          } else {
            // Expired, move to history as timeout
            this.moveToHistory(action.actionId, 'timeout');
          }
        });
        
        this.pendingActions.set(pendingMap);
      }
    } catch (error) {
      console.error('Error loading pending actions from storage:', error);
    }
  }

  saveActionHistoryToStorage(): void {
    const historyArray = this.actionHistory();
    localStorage.setItem('smart-farm-action-history', JSON.stringify(historyArray));
  }

  loadActionHistoryFromStorage(): void {
    try {
      const stored = localStorage.getItem('smart-farm-action-history');
      if (stored) {
        const historyArray: ActionStatus[] = JSON.parse(stored);
        // Keep only last 50 actions to prevent storage bloat
        const recentHistory = historyArray.slice(0, 50);
        this.actionHistory.set(recentHistory);
      }
    } catch (error) {
      console.error('Error loading action history from storage:', error);
    }
  }

  clearExpiredActions(): void {
    // Remove actions older than 24 hours from history
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.actionHistory.update(history => 
      history.filter(action => new Date(action.timestamp) > oneDayAgo)
    );
    this.saveActionHistoryToStorage();
  }

  async executeAction(device: Device, action: ActionTemplate): Promise<void> {
    // Show confirmation dialog for actions that require it
    if (action.requiresConfirmation) {
      const dialogRef = this.dialog.open(ActionConfirmationDialogComponent, {
        width: '500px',
        data: {
          device,
          action,
          farm: this.farms().find(f => f.farm_id === device.farm_id)
        }
      });

      const result = await dialogRef.afterClosed().toPromise();
      if (!result) {
        return; // User cancelled
      }
    }

    // Generate unique action ID
    const actionId = `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Mark action as executing
    this.executingActions.update(actions => new Set([...actions, action.id]));

    try {
      const request: ExecuteActionRequest = {
        deviceId: device.device_id,
        action: action.actionUri,
        actionId: actionId, // Include the frontend-generated action ID
        actionType: action.actionType,
        context: {
          sensorId: 'manual_trigger',
          sensorType: 'manual',
          value: 0,
          unit: '',
          violationType: 'manual'
        }
      };

      const result = await this.apiService.executeAction(request).toPromise();
      
      // Add to pending actions instead of showing success immediately
      this.addPendingAction(actionId, device.device_id, action.name, action.actionUri);
      console.log('📤 [MANUAL-ACTIONS] Action sent with ID:', actionId, 'for device:', device.device_id);
      
      // Show pending message
      this.snackBar.open(
        `Action "${action.name}" sent to device - waiting for confirmation...`, 
        'Close', 
        { duration: 5000 }
      );

      // Note: Real device acknowledgment will be handled by WebSocket updates
      // The action status will be updated when the device responds
      
    } catch (error) {
      console.error('Error executing action:', error);
      this.snackBar.open(
        `Failed to send action "${action.name}"`, 
        'Close', 
        { duration: 5000 }
      );
      
      // Remove from executing actions only on error
      this.executingActions.update(actions => {
        const newSet = new Set(actions);
        newSet.delete(action.id);
        return newSet;
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupWebSocketListeners(): void {
    // Initialize socket connection
    this.notificationService.initSocket();
    console.log('🔧 [MANUAL-ACTIONS] Setting up WebSocket listeners...');

    // Listen for action acknowledgments
    this.notificationService.actionAcknowledged$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        console.log('🎯 [MANUAL-ACTIONS] Action acknowledged:', data);
        console.log('🔍 [MANUAL-ACTIONS] Current pending actions:', Array.from(this.pendingActions().keys()));
        console.log('🔍 [MANUAL-ACTIONS] Pending actions details:', Array.from(this.pendingActions().values()));
        if (data.actionId) {
          console.log('🔄 [MANUAL-ACTIONS] Updating action status:', data.actionId, 'to ack');
          this.updatePendingActionStatus(data.actionId, 'ack', data.executionTime);
        }
      });

    // Listen for action failures
    this.notificationService.actionFailed$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        console.log('❌ [MANUAL-ACTIONS] Action failed:', data);
        if (data.actionId) {
          this.updatePendingActionStatus(data.actionId, 'failed', undefined, data.error);
        }
      });

    // Listen for action timeouts
    this.notificationService.actionTimeout$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        console.log('⏰ [MANUAL-ACTIONS] Action timeout:', data);
        if (data.actionId) {
          this.handleActionTimeout(data.actionId);
        }
      });

    // Listen for device status updates
    this.notificationService.deviceStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        console.log('📊 [MANUAL-ACTIONS] Device status update:', data);
        // Update device status in the UI if needed
        this.updateDeviceStatus(data.deviceId, data.status);
      });
  }

  private updateDeviceStatus(deviceId: string, status: string): void {
    this.devices.update(devices => 
      devices.map(device => 
        device.device_id === deviceId 
          ? { ...device, status: status as any }
          : device
      )
    );
  }

  toggleAutoRefresh(): void {
    this.autoRefreshEnabled.update(enabled => {
      const newEnabled = !enabled;
      if (newEnabled) {
        // Start auto refresh every 30 seconds
        interval(30000)
          .pipe(takeUntil(this.destroy$))
          .subscribe(() => this.loadData());
      }
      return newEnabled;
    });
  }

  filterActions(): void {
    // Trigger computed property update
    this.filteredActions();
  }

  getDeviceCardClass(deviceAction: DeviceActions): string {
    return `device-card-${deviceAction.device.status}`;
  }

  getActionTooltip(action: ActionTemplate): string {
    let tooltip = `${action.description}`;
    if (action.estimatedDuration) {
      tooltip += `\nDuration: ${action.estimatedDuration}`;
    }
    tooltip += `\nQoS: ${action.qosLevel} | Retries: ${action.maxRetries}`;
    return tooltip;
  }

  getActionStatusClass(status: string): string {
    return `action-status-${status}`;
  }

  getActionStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      queued: 'schedule',
      sent: 'send',
      ack: 'check_circle',
      failed: 'error',
      timeout: 'schedule'
    };
    return icons[status] || 'help';
  }

  getActionStatusColor(status: string): 'primary' | 'accent' | 'warn' {
    const colors: { [key: string]: 'primary' | 'accent' | 'warn' } = {
      queued: 'accent',
      sent: 'primary',
      ack: 'primary',
      failed: 'warn',
      timeout: 'warn'
    };
    return colors[status] || 'primary';
  }

  showActionCompletionNotification(status: 'ack' | 'failed' | 'timeout', actionName: string): void {
    let message = '';
    let duration = 5000;

    switch (status) {
      case 'ack':
        message = `✅ Action "${actionName}" completed successfully!`;
        break;
      case 'failed':
        message = `❌ Action "${actionName}" failed on device`;
        duration = 8000;
        break;
      case 'timeout':
        message = `⏰ Action "${actionName}" timed out - device may be offline`;
        duration = 8000;
        break;
    }

    this.snackBar.open(message, 'Close', { 
      duration,
      panelClass: status === 'ack' ? 'success-snackbar' : 'error-snackbar'
    });
  }
}
