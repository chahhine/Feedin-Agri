import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTabsModule } from '@angular/material/tabs';
import { interval, Subscription } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { ApiService } from '../../core/services/api.service';
import { FarmManagementService } from '../../core/services/farm-management.service';
import { ActionLog } from '../../core/models/action-log.model';
import { Device, Farm } from '../../core/models/farm.model';
import { ActionDetailsDialogComponent } from './components/action-details-dialog/action-details-dialog.component';
import { ManualActionsV2Component } from '../dashboard/components/manual-actions-v2/manual-actions-v2.component';
import { ActionsFeedComponent } from '../dashboard/components/actions-feed/actions-feed.component';
import { LanguageService } from '../../core/services/language.service';

interface ActionFilters {
  device_id?: string;
  sensor_id?: string;
  trigger_source?: 'auto' | 'manual';
  status?: 'queued' | 'sent' | 'ack' | 'error';
  from?: string;
  to?: string;
}

interface ActionStats {
  total: number;
  auto: number;
  manual: number;
  successful: number;
  failed: number;
  pending: number;
}

@Component({
  selector: 'app-actions',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatPaginatorModule,
    MatSortModule,
    MatTooltipModule,
    MatMenuModule,
    MatSnackBarModule,
    MatDialogModule,
    MatExpansionModule,
    MatTabsModule,
    ReactiveFormsModule,
    ManualActionsV2Component,
    ActionsFeedComponent,
  ],
  template: `
    <div class="actions-container">
      <!-- Header -->
      <div class="header">
        <h1><mat-icon>control_camera</mat-icon> {{ languageService.t()('actions.title') }}</h1>
        <p>{{ languageService.t()('actions.subtitle') }}</p>
      </div>

      <!-- Tabs -->
      <mat-tab-group class="actions-tabs" animationDuration="300ms">
        <!-- Manual Control Tab -->
        <mat-tab [label]="languageService.t()('actions.manualControl')">
          <div class="tab-content">
            <app-manual-actions-v2></app-manual-actions-v2>
          </div>
        </mat-tab>

        <!-- Recent Actions Feed Tab -->
        <mat-tab [label]="languageService.t()('actions.recentActions')">
          <div class="tab-content">
            <div class="tab-header">
              <div class="tab-info">
                <h2><mat-icon>rss_feed</mat-icon> {{ languageService.t()('actions.liveFeed') }}</h2>
                <p>{{ languageService.t()('actions.liveFeedDescription') }}</p>
              </div>
            </div>
            <app-actions-feed></app-actions-feed>
          </div>
        </mat-tab>

        <!-- Action History Tab -->
        <mat-tab [label]="languageService.t()('actions.history')">
          <div class="tab-content">
            <!-- Integrated Summary with Time Filter -->
            <div class="quick-summary" *ngIf="!isLoading()">
              <mat-card class="summary-card">
                <mat-card-content>
                  <!-- Time Filter Section Integrated into Summary -->
                  <div class="summary-header">
                    <h3><mat-icon>analytics</mat-icon> {{ getTimeFilterLabel() }} {{ languageService.t()('actions.summary') }}</h3>
                    <div class="time-buttons">
                      <button mat-raised-button 
                              [color]="selectedTimeFilter() === 'today' ? 'primary' : ''"
                              (click)="setTimeFilter('today')">
                        <mat-icon>today</mat-icon>
                        {{ languageService.t()('actions.today') }}
                      </button>
                      <button mat-raised-button 
                              [color]="selectedTimeFilter() === 'yesterday' ? 'primary' : ''"
                              (click)="setTimeFilter('yesterday')">
                        <mat-icon>history</mat-icon>
                        {{ languageService.t()('actions.yesterday') }}
                      </button>
                      <button mat-raised-button 
                              [color]="selectedTimeFilter() === 'week' ? 'primary' : ''"
                              (click)="setTimeFilter('week')">
                        <mat-icon>date_range</mat-icon>
                        {{ languageService.t()('actions.thisWeek') }}
                      </button>
                      <button mat-raised-button 
                              [color]="selectedTimeFilter() === 'month' ? 'primary' : ''"
                              (click)="setTimeFilter('month')">
                        <mat-icon>calendar_month</mat-icon>
                        {{ languageService.t()('actions.thisMonth') }}
                      </button>
                    </div>
                  </div>
                  
                  <!-- Summary Stats -->
                  <div class="summary-stats">
                    <div class="summary-item">
                      <div class="summary-icon total">
                        <mat-icon>history</mat-icon>
                      </div>
                      <div class="summary-info">
                        <span class="number">{{ filteredActions().length }}</span>
                        <span class="label">{{ languageService.t()('actions.totalActions') }}</span>
                      </div>
                    </div>
                    <div class="summary-item">
                      <div class="summary-icon success">
                        <mat-icon>check_circle</mat-icon>
                      </div>
                      <div class="summary-info">
                        <span class="number">{{ getSuccessfulCount() }}</span>
                        <span class="label">{{ languageService.t()('actions.successful') }}</span>
                      </div>
                    </div>
                    <div class="summary-item">
                      <div class="summary-icon error">
                        <mat-icon>error</mat-icon>
                      </div>
                      <div class="summary-info">
                        <span class="number">{{ getFailedCount() }}</span>
                        <span class="label">{{ languageService.t()('actions.failed') }}</span>
                      </div>
                    </div>
                    <div class="summary-item">
                      <div class="summary-icon manual">
                        <mat-icon>touch_app</mat-icon>
                      </div>
                      <div class="summary-info">
                        <span class="number">{{ getManualCount() }}</span>
                        <span class="label">{{ languageService.t()('actions.manual') }}</span>
                      </div>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>

            <!-- Activity List -->
            <div class="activity-list" *ngIf="!isLoading()">
              <div *ngIf="filteredActions().length > 0; else noActivity">
                <div class="activity-item" *ngFor="let action of filteredActions(); trackBy: trackByActionId">
                  <div class="activity-icon">
                    <mat-icon [ngClass]="getActivityIconClass(action)">{{ getActivityIcon(action) }}</mat-icon>
                  </div>
                  <div class="activity-content">
                    <div class="activity-header">
                      <h4>{{ getActivityTitle(action) }}</h4>
                      <span class="activity-time">{{ action.created_at | date:'short' }}</span>
                    </div>
                    <div class="activity-description">
                      <p>{{ getActivityDescription(action) }}</p>
                    </div>
                    <div class="activity-meta">
                      <mat-chip [ngClass]="getStatusChipClass(action.status)" size="small">
                        {{ getStatusText(action.status) }}
                      </mat-chip>
                      <mat-chip [ngClass]="getSourceChipClass(action.trigger_source)" size="small">
                        <mat-icon>{{ action.trigger_source === 'auto' ? 'settings' : 'touch_app' }}</mat-icon>
                        {{ getSourceText(action.trigger_source) }}
                      </mat-chip>
                      <span class="device-name">
                        <mat-icon>devices</mat-icon>
                        {{ getDeviceName(action.device_id) }}
                      </span>
                    </div>
                    <div class="activity-error" *ngIf="action.status === 'error' && action.error_message">
                      <mat-icon>warning</mat-icon>
                      <span>{{ action.error_message }}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <ng-template #noActivity>
                <div class="no-activity">
                  <mat-icon>event_available</mat-icon>
                  <h3>{{ languageService.t()('actions.noActivity') }} {{ getTimeFilterLabel() }}</h3>
                  <p>{{ getNoActivityMessage() }}</p>
                  <button mat-raised-button color="primary" (click)="setTimeFilter('week')" *ngIf="selectedTimeFilter() === 'today'">
                    <mat-icon>date_range</mat-icon>
                    {{ languageService.t()('actions.showThisWeek') }}
                  </button>
                </div>
              </ng-template>

              <!-- Load More Button -->
              <div class="load-more-section" *ngIf="hasMoreActions() && !isLoading()">
                <button mat-raised-button 
                        color="primary" 
                        (click)="loadMoreActions()" 
                        [disabled]="loadingMore()"
                        class="load-more-button">
                  <mat-icon *ngIf="!loadingMore()">expand_more</mat-icon>
                  <mat-spinner *ngIf="loadingMore()" diameter="20"></mat-spinner>
                  {{ loadingMore() ? languageService.t()('common.loading') : languageService.t()('actions.showMore') }}
                </button>
                <p class="load-more-info">
                  {{ languageService.t()('actions.showingActions', { current: actions().length, total: totalActions() }) }}
                </p>
              </div>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .actions-container {
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
    }
    
    .header {
      margin-bottom: 24px;
      text-align: center;
    }
    
    .header h1 {
      margin: 0 0 8px 0;
      color: #2e7d32;
      font-size: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }

    .header h1 mat-icon {
      font-size: 2rem;
      width: 2rem;
      height: 2rem;
    }
    
    .header p {
      margin: 0;
      color: #666;
      font-size: 1.1rem;
    }

    .actions-tabs {
      margin-top: 24px;
    }

    .tab-content {
      padding: 24px 0;
    }

    .tab-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .tab-info h2 {
      margin: 0 0 8px 0;
      color: #333;
      font-size: 1.5rem;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .tab-info h2 mat-icon {
      color: #2e7d32;
    }

    .tab-info p {
      margin: 0;
      color: #666;
    }
    
    .header-actions {
      display: flex;
      gap: 12px;
      flex-shrink: 0;
    }

    @media (max-width: 768px) {
      .tab-header {
        flex-direction: column;
        align-items: stretch;
      }

      .header-actions {
        justify-content: center;
      }
    }

    /* Time Filter Section */
    .time-filter-section {
      margin-bottom: 24px;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 12px;
    }

    .time-filter-section h3 {
      margin: 0 0 16px 0;
      color: #333;
      font-size: 1.2rem;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .time-filter-section h3 mat-icon {
      color: #2e7d32;
    }

    .time-buttons {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .time-buttons button {
      border-radius: 8px;
      font-weight: 500;
    }

    @media (max-width: 768px) {
      .time-buttons {
        justify-content: center;
      }
      
      .time-buttons button {
        flex: 1;
        min-width: 120px;
      }
    }

    /* Quick Summary */
    .quick-summary {
      margin-bottom: 24px;
    }

    .summary-card {
      border-radius: 12px;
      background: linear-gradient(135deg, #2e7d32 0%, #1b5e20 50%, #0d4f1c 100%);
      color: white;
      box-shadow: 0 4px 20px rgba(46, 125, 50, 0.3);
    }

    .summary-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .summary-header h3 {
      margin: 0;
      font-size: 1.3rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .summary-header h3 mat-icon {
      color: white;
    }

    .summary-header .time-buttons {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .summary-header .time-buttons button {
      border-radius: 6px;
      font-weight: 500;
      font-size: 0.85rem;
      padding: 8px 12px;
      min-width: auto;
      background: rgba(255, 255, 255, 0.1);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .summary-header .time-buttons button:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .summary-header .time-buttons button[color="primary"] {
      background: rgba(255, 255, 255, 0.9);
      color: #333;
      border: 1px solid rgba(255, 255, 255, 0.9);
    }

    .summary-header .time-buttons button mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .summary-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 20px;
    }

    .summary-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: all 0.2s ease;
    }

    .summary-item:hover {
      background: rgba(255, 255, 255, 0.12);
      transform: translateY(-1px);
    }

    .summary-icon {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .summary-icon mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: white;
    }

    .summary-info {
      display: flex;
      flex-direction: column;
    }

    .summary-info .number {
      font-size: 1.5rem;
      font-weight: 700;
      line-height: 1;
    }

    .summary-info .label {
      font-size: 0.85rem;
      opacity: 0.9;
      margin-top: 2px;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    
    .stat-card {
      border-radius: 12px;
    }
    
    .stat-content {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    
    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .stat-icon mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }
    
    .stat-icon.total { background-color: #e8f5e9; color: #2e7d32; }
    .stat-icon.auto { background-color: #e8f5e9; color: #388e3c; }
    .stat-icon.manual { background-color: #fff3e0; color: #f57c00; }
    .stat-icon.success { background-color: #e8f5e9; color: #388e3c; }
    .stat-icon.error { background-color: #ffebee; color: #d32f2f; }
    .stat-icon.pending { background-color: #e1f5fe; color: #0277bd; }
    
    .stat-info h3 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
      color: #333;
    }
    
    .stat-info p {
      margin: 4px 0 0 0;
      color: #666;
      font-size: 14px;
    }
    
    .filters-card {
      margin-bottom: 24px;
    }
    
    .filters-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 16px;
    }
    
    .filter-actions {
      display: flex;
      justify-content: flex-end;
    }
    
    .table-card {
      margin-bottom: 24px;
    }
    
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
    }
    
    .table-container {
      overflow-x: auto;
    }
    
    .actions-table {
      width: 100%;
    }
    
    .actions-table th {
      font-weight: 600;
      color: #2e7d32;
    }
    
    .actions-table td {
      padding: 12px 16px;
    }
    
    .timestamp-cell {
      display: flex;
      flex-direction: column;
    }
    
    .timestamp-cell .date {
      font-weight: 500;
    }
    
    .timestamp-cell .time {
      font-size: 12px;
      color: #666;
    }
    
    .device-cell, .sensor-cell, .action-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .sensor-type {
      font-size: 12px;
      color: #666;
    }
    
    .manual-trigger {
      font-style: italic;
      color: #666;
    }
    
    .value-cell {
      font-weight: 500;
      color: #333;
    }
    
    .no-value {
      color: #999;
    }
    
    .status-queued { background-color: #e8f5e9; color: #2e7d32; }
    .status-sent { background-color: #e8f5e9; color: #388e3c; }
    .status-ack { background-color: #e0f7fa; color: #0097a7; }
    .status-error { background-color: #ffebee; color: #d32f2f; }
    
    .no-data {
      text-align: center;
      padding: 60px 20px;
      color: #666;
    }
    
    .no-data mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      margin-bottom: 16px;
      opacity: 0.5;
    }
    
    .no-data h3 {
      margin-bottom: 8px;
      color: #333;
    }
    
    .no-data p {
      margin-bottom: 24px;
    }

    /* Activity List */
    .activity-list {
      margin-top: 24px;
    }

    .activity-item {
      display: flex;
      gap: 16px;
      padding: 20px;
      background: white;
      border-radius: 12px;
      margin-bottom: 16px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border-left: 4px solid #e0e0e0;
      transition: all 0.2s ease;
    }

    .activity-item:hover {
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      transform: translateY(-2px);
    }

    .activity-item:has(.error-icon) {
      border-left-color: #f44336;
      background: #fafafa;
    }

    .activity-item:has(.manual-icon) {
      border-left-color: #ff9800;
    }

    .activity-item:has(.auto-icon) {
      border-left-color: #4caf50;
    }

    .activity-icon {
      flex-shrink: 0;
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .activity-icon mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .error-icon {
      background: #ffebee;
      color: #f44336;
    }

    .manual-icon {
      background: #fff3e0;
      color: #ff9800;
    }

    .auto-icon {
      background: #e8f5e9;
      color: #4caf50;
    }

    .activity-content {
      flex: 1;
      min-width: 0;
    }

    .activity-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
      gap: 16px;
    }

    .activity-header h4 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
      color: #333;
      line-height: 1.3;
    }

    .activity-time {
      font-size: 0.85rem;
      color: #666;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .activity-description {
      margin-bottom: 12px;
    }

    .activity-description p {
      margin: 0;
      color: #555;
      line-height: 1.4;
    }

    .activity-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .activity-meta mat-chip {
      font-size: 0.75rem;
      height: 24px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .activity-meta mat-chip mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .success-chip {
      background: #e8f5e9;
      color: #2e7d32;
    }

    .error-chip {
      background: #ffebee;
      color: #c62828;
    }

    .pending-chip {
      background: #e3f2fd;
      color: #1565c0;
    }

    .auto-chip {
      background: #e8f5e9;
      color: #2e7d32;
    }

    .manual-chip {
      background: #fff3e0;
      color: #ef6c00;
    }

    .device-name {
      font-size: 0.85rem;
      color: #666;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .device-name mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .activity-error {
      margin-top: 12px;
      padding: 12px;
      background: #ffebee;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
      color: #c62828;
      font-size: 0.9rem;
    }

    .activity-error mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    /* No Activity State */
    .no-activity {
      text-align: center;
      padding: 60px 20px;
      color: #666;
      background: white;
      border-radius: 12px;
      margin-top: 24px;
    }

    .no-activity mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      margin-bottom: 16px;
      opacity: 0.5;
      color: #4caf50;
    }

    .no-activity h3 {
      margin-bottom: 8px;
      color: #333;
      font-size: 1.3rem;
    }

    .no-activity p {
      margin-bottom: 24px;
      font-size: 1rem;
    }

    /* Load More Section */
    .load-more-section {
      text-align: center;
      padding: 32px 20px;
      margin-top: 24px;
    }

    .load-more-button {
      border-radius: 8px;
      font-weight: 500;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 auto 12px auto;
    }

    .load-more-button mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .load-more-button mat-spinner {
      margin-right: 8px;
    }

    .load-more-info {
      margin: 0;
      color: #666;
      font-size: 0.9rem;
    }

    @media (max-width: 768px) {
      .activity-item {
        padding: 16px;
        gap: 12px;
      }

      .activity-icon {
        width: 40px;
        height: 40px;
      }

      .activity-icon mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      .activity-header {
        flex-direction: column;
        gap: 8px;
      }

      .activity-time {
        align-self: flex-start;
      }

      .activity-meta {
        gap: 8px;
      }

      .summary-stats {
        grid-template-columns: repeat(2, 1fr);
      }

      .summary-header {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
      }

      .summary-header .time-buttons {
        justify-content: center;
      }

      .summary-header .time-buttons button {
        flex: 1;
        min-width: 80px;
      }
    }
  `]
})
export class ActionsComponent implements OnInit, OnDestroy {
  private apiService = inject(ApiService);
  private farmManagement = inject(FarmManagementService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  public languageService = inject(LanguageService);
  private refreshSubscription: Subscription | undefined;

  // Signals
  isLoading = signal(false);
  actions = signal<ActionLog[]>([]);
  devices = signal<Device[]>([]);
  farms = signal<Farm[]>([]);
  selectedTimeFilter = signal<'today' | 'yesterday' | 'week' | 'month'>('today');
  
  // Pagination properties
  totalActions = signal(0);
  pageSize = 20;
  loadingMore = signal(false);
  hasMoreActions = signal(false);

  // Form controls
  deviceFilter = new FormControl('');
  sourceFilter = new FormControl('');
  statusFilter = new FormControl('');
  fromDateFilter = new FormControl<Date | null>(null);
  toDateFilter = new FormControl<Date | null>(null);
  searchFilter = new FormControl('');

  // Table configuration
  displayedColumns: string[] = [
    'created_at',
    'trigger_source',
    'device_id',
    'sensor_id',
    'action_uri',
    'status',
    'value',
    'actions'
  ];

  // Computed properties
  filteredActions = computed(() => {
    let filtered = this.actions();
    
    // Apply time filter
    const timeFilter = this.selectedTimeFilter();
    const now = new Date();
    let startDate: Date;
    
    switch (timeFilter) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'yesterday':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        filtered = filtered.filter(a => {
          const actionDate = new Date(a.created_at);
          return actionDate >= startDate && actionDate < endDate;
        });
        return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'week':
        const dayOfWeek = now.getDay();
        const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday as start of week
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToSubtract);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
    
    // Filter by start date (yesterday case is already handled above)
    filtered = filtered.filter(a => new Date(a.created_at) >= startDate);
    
    // Sort by newest first
    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  });

  stats = computed(() => {
    const actions = this.actions();
    return {
      total: actions.length,
      auto: actions.filter(a => a.trigger_source === 'auto').length,
      manual: actions.filter(a => a.trigger_source === 'manual').length,
      successful: actions.filter(a => a.status === 'sent' || a.status === 'ack').length,
      failed: actions.filter(a => a.status === 'error').length,
      pending: actions.filter(a => a.status === 'queued').length
    };
  });

  ngOnInit(): void {
    this.loadData();
    this.startRealTimeUpdates();
    
    // Subscribe to farm selection changes
    this.farmManagement.selectedFarm$.subscribe(selectedFarm => {
      if (selectedFarm) {
        console.log('🏡 [ACTIONS] Farm changed, reloading data for:', selectedFarm.name);
        this.loadData();
      }
    });
  }

  ngOnDestroy(): void {
    this.refreshSubscription?.unsubscribe();
  }

  startRealTimeUpdates(): void {
    this.refreshSubscription = interval(30000).pipe( // Refresh every 30 seconds
      startWith(0),
      switchMap(() => this.loadActions())
    ).subscribe();
  }

  async loadData(): Promise<void> {
    this.isLoading.set(true);
    try {
      const selectedFarm = this.farmManagement.getSelectedFarm();
      if (!selectedFarm) {
        console.log('⚠️ [ACTIONS] No farm selected, skipping data load');
        this.isLoading.set(false);
        return;
      }
      
      console.log('🏡 [ACTIONS] Loading data for farm:', selectedFarm.name);
      
      // Load devices for selected farm only
      const devices = await this.apiService.getDevicesByFarm(selectedFarm.farm_id).toPromise();
      
      this.devices.set(devices || []);
      
      await this.loadActions();
    } catch (error) {
      console.error('Error loading data:', error);
      this.snackBar.open(this.languageService.t()('actions.loadDataError'), this.languageService.t()('common.close'), { duration: 3000 });
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadActions(offset = 0, append = false): Promise<void> {
    try {
      if (append) {
        this.loadingMore.set(true);
      } else {
        this.isLoading.set(true);
      }

      const selectedFarm = this.farmManagement.getSelectedFarm();
      if (!selectedFarm) {
        console.log('⚠️ [ACTIONS] No farm selected, skipping actions load');
        this.isLoading.set(false);
        this.loadingMore.set(false);
        return;
      }

      // Load last 7 days of actions for selected farm only
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      // Get devices for selected farm to filter actions
      const farmDevices = await this.apiService.getDevicesByFarm(selectedFarm.farm_id).toPromise();
      const farmDeviceIds = farmDevices?.map(device => device.device_id) || [];
      
      console.log('🏡 [ACTIONS] Loading actions for farm:', selectedFarm.name, 'Devices:', farmDeviceIds);
      
      // Load actions for each device separately since backend doesn't support multiple device_ids
      let allActions: any[] = [];
      let totalCount = 0;
      
      for (const deviceId of farmDeviceIds) {
        const response = await this.apiService.getActions({ 
          limit: 100, // Get more per device to ensure we have enough
          offset: 0,
          from: sevenDaysAgo.toISOString(),
          device_id: deviceId
        }).toPromise();
        
        if (response?.items) {
          allActions = [...allActions, ...response.items];
          totalCount += response.total || 0;
        }
      }
      
      // Sort by creation date and apply pagination
      allActions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      const paginatedActions = allActions.slice(offset, offset + this.pageSize);
      
      if (append) {
        // Append to existing actions
        this.actions.set([...this.actions(), ...paginatedActions]);
      } else {
        // Replace actions
        this.actions.set(paginatedActions);
      }
      
      this.totalActions.set(totalCount);
      this.hasMoreActions.set(this.actions().length < totalCount);
      
    } catch (error: any) {
      console.error('Error loading actions:', error);
      if (error?.status === 401) {
        this.snackBar.open(this.languageService.t()('auth.sessionExpired'), this.languageService.t()('common.close'), { duration: 5000 });
        // The auth interceptor should handle the redirect
      } else {
        this.snackBar.open(this.languageService.t()('actions.loadActionsError'), this.languageService.t()('common.close'), { duration: 3000 });
      }
    } finally {
      this.isLoading.set(false);
      this.loadingMore.set(false);
    }
  }

  async loadMoreActions(): Promise<void> {
    if (this.loadingMore() || !this.hasMoreActions()) return;
    
    const currentOffset = this.actions().length;
    await this.loadActions(currentOffset, true);
  }

  refreshActions(): void {
    this.loadActions(0, false); // Reload from beginning
  }

  applyFilters(): void {
    // Filters are applied automatically through computed properties
  }

  clearFilters(): void {
    this.deviceFilter.setValue('');
    this.sourceFilter.setValue('');
    this.statusFilter.setValue('');
    this.fromDateFilter.setValue(null);
    this.toDateFilter.setValue(null);
    this.searchFilter.setValue('');
  }

  getDeviceName(deviceId: string): string {
    const device = this.devices().find(d => d.device_id === deviceId);
    if (device) {
      // Get the selected farm to show farm name
      const selectedFarm = this.farmManagement.getSelectedFarm();
      if (selectedFarm && device.location) {
        return `${selectedFarm.name} - ${device.location}`;
      } else if (device.location) {
        return device.location;
      } else if (selectedFarm) {
        return `${selectedFarm.name} - ${device.name}`;
      } else {
        return device.name;
      }
    }
    
    // Translate common device names/IDs if no device found
    const deviceMap: { [key: string]: string } = {
      'dht11 sensor': this.languageService.t()('devices.deviceTypes.dht11Sensor'),
      'dht22 sensor': this.languageService.t()('devices.deviceTypes.dht22Sensor'),
      'soil moisture sensor': this.languageService.t()('devices.deviceTypes.soilMoistureSensor'),
      'water pump': this.languageService.t()('devices.deviceTypes.waterPump'),
      'irrigation pump': this.languageService.t()('devices.deviceTypes.irrigationPump'),
      'fan': this.languageService.t()('devices.deviceTypes.fan'),
      'ventilator': this.languageService.t()('devices.deviceTypes.ventilator'),
      'heater': this.languageService.t()('devices.deviceTypes.heater'),
      'light': this.languageService.t()('devices.deviceTypes.light'),
      'led light': this.languageService.t()('devices.deviceTypes.ledLight'),
      'roof motor': this.languageService.t()('devices.deviceTypes.roofMotor'),
      'window motor': this.languageService.t()('devices.deviceTypes.windowMotor'),
      'gateway': this.languageService.t()('devices.deviceTypes.gateway'),
      'controller': this.languageService.t()('devices.deviceTypes.controller')
    };
    
    const translatedName = deviceMap[deviceId.toLowerCase()];
    return translatedName || deviceId;
  }

  getActionName(actionUri: string): string {
    const parts = actionUri.split('/');
    return parts[parts.length - 1].replace(/_/g, ' ').replace(/mqtt:/, '');
  }

  getActionIcon(actionUri: string): string {
    const action = actionUri.toLowerCase();
    if (action.includes('irrigation')) return 'water_drop';
    if (action.includes('fan') || action.includes('ventilation')) return 'air';
    if (action.includes('heater') || action.includes('heating')) return 'local_fire_department';
    if (action.includes('light')) return 'lightbulb';
    if (action.includes('roof')) return 'open_in_full';
    if (action.includes('alarm')) return 'security';
    if (action.includes('restart')) return 'restart_alt';
    if (action.includes('calibrate')) return 'tune';
    return 'settings';
  }

  getStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      queued: 'schedule',
      sent: 'send',
      ack: 'check_circle',
      error: 'error'
    };
    return icons[status] || 'help_outline';
  }

  viewActionDetails(action: ActionLog): void {
    const dialogRef = this.dialog.open(ActionDetailsDialogComponent, {
      width: '600px',
      data: { action, devices: this.devices(), farms: this.farms() }
    });
  }

  retryAction(action: ActionLog): void {
    // TODO: Implement retry functionality
    this.snackBar.open(this.languageService.t()('actions.retryComingSoon'), this.languageService.t()('common.close'), { duration: 3000 });
  }

  exportActions(): void {
    // TODO: Implement export functionality
    this.snackBar.open(this.languageService.t()('actions.exportComingSoon'), this.languageService.t()('common.close'), { duration: 3000 });
  }

  // Farmer-friendly methods
  setTimeFilter(filter: 'today' | 'yesterday' | 'week' | 'month'): void {
    this.selectedTimeFilter.set(filter);
  }

  getTimeFilterLabel(): string {
    switch (this.selectedTimeFilter()) {
      case 'today': return this.languageService.t()('actions.today');
      case 'yesterday': return this.languageService.t()('actions.yesterday');
      case 'week': return this.languageService.t()('actions.thisWeek');
      case 'month': return this.languageService.t()('actions.thisMonth');
      default: return this.languageService.t()('actions.today');
    }
  }

  getSuccessfulCount(): number {
    return this.filteredActions().filter(a => a.status === 'sent' || a.status === 'ack').length;
  }

  getFailedCount(): number {
    return this.filteredActions().filter(a => a.status === 'error').length;
  }

  getManualCount(): number {
    return this.filteredActions().filter(a => a.trigger_source === 'manual').length;
  }

  getActivityIcon(action: ActionLog): string {
    if (action.status === 'error') return 'error';
    if (action.trigger_source === 'manual') return 'touch_app';
    
    const actionName = action.action_uri.toLowerCase();
    if (actionName.includes('irrigation') || actionName.includes('water')) return 'water_drop';
    if (actionName.includes('ventilator') || actionName.includes('fan')) return 'air';
    if (actionName.includes('light')) return 'lightbulb';
    if (actionName.includes('heater')) return 'local_fire_department';
    if (actionName.includes('roof')) return 'open_in_full';
    if (actionName.includes('humidifier')) return 'humidity_percentage';
    return 'settings';
  }

  getActivityIconClass(action: ActionLog): string {
    if (action.status === 'error') return 'error-icon';
    if (action.trigger_source === 'manual') return 'manual-icon';
    return 'auto-icon';
  }

  getActivityTitle(action: ActionLog): string {
    const actionName = this.getActionName(action.action_uri);
    const deviceName = this.getDeviceName(action.device_id);
    
    if (action.trigger_source === 'manual') {
      return this.languageService.t()('actions.manualActionTitle', { 
        action: this.getActionNameTranslation(actionName), 
        device: deviceName 
      });
    } else {
      const reason = this.getAutomationReason(action);
      return this.languageService.t()('actions.automaticActionTitle', { 
        action: this.getActionNameTranslation(actionName), 
        device: deviceName, 
        reason: reason 
      });
    }
  }

  getActivityDescription(action: ActionLog): string {
    if (action.status === 'error') {
      return this.languageService.t()('actions.actionFailedDescription', { error: action.error_message || this.languageService.t()('actions.checkDeviceConnection') });
    }
    
    if (action.trigger_source === 'manual') {
      const time = new Date(action.created_at).toLocaleTimeString();
      return this.languageService.t()('actions.manualActionDescription', { time: time });
    } else {
      const sensorInfo = action.sensor_type && action.value 
        ? this.languageService.t()('actions.automaticActionDescription', { 
            sensor: this.getSensorTypeTranslation(action.sensor_type), 
            value: action.value, 
            unit: this.getUnitTranslation(action.unit || '') 
          })
        : this.languageService.t()('actions.automaticActionDescriptionSimple');
      return sensorInfo;
    }
  }

  getAutomationReason(action: ActionLog): string {
    if (action.sensor_type && action.value) {
      return this.languageService.t()('actions.automationReason', { 
        sensor: this.getSensorTypeTranslation(action.sensor_type), 
        value: action.value, 
        unit: this.getUnitTranslation(action.unit || '') 
      });
    }
    return '';
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'sent': return this.languageService.t()('actions.statusSent');
      case 'ack': return this.languageService.t()('actions.statusConfirmed');
      case 'error': return this.languageService.t()('actions.statusFailed');
      case 'queued': return this.languageService.t()('actions.statusWaiting');
      default: return status;
    }
  }

  getStatusChipClass(status: string): string {
    switch (status) {
      case 'sent':
      case 'ack': return 'success-chip';
      case 'error': return 'error-chip';
      case 'queued': return 'pending-chip';
      default: return '';
    }
  }

  getSourceChipClass(source: string): string {
    return source === 'auto' ? 'auto-chip' : 'manual-chip';
  }

  getSourceText(source: string): string {
    switch (source) {
      case 'auto': return this.languageService.t()('actions.automatic');
      case 'manual': return this.languageService.t()('actions.manual');
      default: return source;
    }
  }

  getSensorTypeTranslation(sensorType: string): string {
    const sensorTypeMap: { [key: string]: string } = {
      'temperature': this.languageService.t()('sensors.sensorTypes.temperature'),
      'humidity': this.languageService.t()('sensors.sensorTypes.humidity'),
      'soil_moisture': this.languageService.t()('sensors.sensorTypes.soilMoisture'),
      'soil': this.languageService.t()('sensors.sensorTypes.soil'),
      'light': this.languageService.t()('sensors.sensorTypes.light'),
      'ph': this.languageService.t()('sensors.sensorTypes.ph'),
      'nutrients': this.languageService.t()('sensors.sensorTypes.nutrients'),
      'pressure': this.languageService.t()('sensors.sensorTypes.pressure'),
      'wind': this.languageService.t()('sensors.sensorTypes.wind'),
      'rain': this.languageService.t()('sensors.sensorTypes.rain'),
      'co2': this.languageService.t()('sensors.sensorTypes.co2')
    };
    return sensorTypeMap[sensorType.toLowerCase()] || sensorType;
  }

  getUnitTranslation(unit: string): string {
    const unitMap: { [key: string]: string } = {
      'celsius': this.languageService.t()('sensors.units.celsius'),
      'fahrenheit': this.languageService.t()('sensors.units.fahrenheit'),
      'percent': this.languageService.t()('sensors.units.percent'),
      'lux': this.languageService.t()('sensors.units.lux'),
      'ph': this.languageService.t()('sensors.units.ph'),
      'bar': this.languageService.t()('sensors.units.bar'),
      'kmh': this.languageService.t()('sensors.units.kmh'),
      'mm': this.languageService.t()('sensors.units.mm'),
      'ppm': this.languageService.t()('sensors.units.ppm')
    };
    return unitMap[unit.toLowerCase()] || unit;
  }

  getActionNameTranslation(actionName: string): string {
    const actionMap: { [key: string]: string } = {
      'irrigation': this.languageService.t()('actions.actionTypes.irrigation'),
      'fertilization': this.languageService.t()('actions.actionTypes.fertilization'),
      'pest control': this.languageService.t()('actions.actionTypes.pestControl'),
      'harvesting': this.languageService.t()('actions.actionTypes.harvesting'),
      'planting': this.languageService.t()('actions.actionTypes.planting'),
      'pruning': this.languageService.t()('actions.actionTypes.pruning'),
      'monitoring': this.languageService.t()('actions.actionTypes.monitoring'),
      'alert': this.languageService.t()('actions.actionTypes.alert'),
      'watering': this.languageService.t()('actions.actionTypes.watering'),
      'ventilation': this.languageService.t()('actions.actionTypes.ventilation'),
      'heating': this.languageService.t()('actions.actionTypes.heating'),
      'lighting': this.languageService.t()('actions.actionTypes.lighting'),
      'open roof': this.languageService.t()('actions.actionTypes.openRoof'),
      'close roof': this.languageService.t()('actions.actionTypes.closeRoof'),
      'open window': this.languageService.t()('actions.actionTypes.openWindow'),
      'close window': this.languageService.t()('actions.actionTypes.closeWindow'),
      'start pump': this.languageService.t()('actions.actionTypes.startPump'),
      'stop pump': this.languageService.t()('actions.actionTypes.stopPump'),
      'turn on fan': this.languageService.t()('actions.actionTypes.turnOnFan'),
      'turn off fan': this.languageService.t()('actions.actionTypes.turnOffFan'),
      'turn on heater': this.languageService.t()('actions.actionTypes.turnOnHeater'),
      'turn off heater': this.languageService.t()('actions.actionTypes.turnOffHeater'),
      'turn on light': this.languageService.t()('actions.actionTypes.turnOnLight'),
      'turn off light': this.languageService.t()('actions.actionTypes.turnOffLight'),
      'humidifier on': this.languageService.t()('actions.actionTypes.humidifierOn'),
      'humidifier off': this.languageService.t()('actions.actionTypes.humidifierOff'),
      'ventilator on': this.languageService.t()('actions.actionTypes.ventilatorOn'),
      'ventilator off': this.languageService.t()('actions.actionTypes.ventilatorOff'),
      'water pump on': this.languageService.t()('actions.actionTypes.waterPumpOn'),
      'water pump off': this.languageService.t()('actions.actionTypes.waterPumpOff'),
      'light on': this.languageService.t()('actions.actionTypes.lightOn'),
      'light off': this.languageService.t()('actions.actionTypes.lightOff')
    };
    
    return actionMap[actionName.toLowerCase()] || actionName;
  }

  getNoActivityMessage(): string {
    switch (this.selectedTimeFilter()) {
      case 'today': return this.languageService.t()('actions.noActivityToday');
      case 'yesterday': return this.languageService.t()('actions.noActivityYesterday');
      case 'week': return this.languageService.t()('actions.noActivityWeek');
      case 'month': return this.languageService.t()('actions.noActivityMonth');
      default: return this.languageService.t()('actions.noActivityFound');
    }
  }

  trackByActionId(index: number, action: ActionLog): string {
    return action.id || index.toString();
  }
}
