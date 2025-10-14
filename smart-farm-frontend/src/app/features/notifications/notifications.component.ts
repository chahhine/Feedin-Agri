import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDeleteDialogComponent } from './confirm-delete-dialog.component';
import { NotificationService } from '../../core/services/notification.service';
import { ApiService } from '../../core/services/api.service';
import { FarmManagementService } from '../../core/services/farm-management.service';
import { LanguageService } from '../../core/services/language.service';
import { AppNotification } from '../../core/models/notification.model';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule, MatButtonModule, MatChipsModule, MatDividerModule, MatTooltipModule, MatDialogModule],
  template: `
    <div class="container">
      <!-- Header -->
      <div class="header">
        <h1><mat-icon>notifications</mat-icon> {{ languageService.t()('notifications.title') }}</h1>
        <p>{{ languageService.t()('notifications.subtitle') }}</p>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions" *ngIf="notifications().length > 0">
        <div class="summary-stats">
          <div class="stat-item urgent" *ngIf="getUrgentCount() > 0">
            <mat-icon>priority_high</mat-icon>
            <span>{{ getUrgentCount() }} {{ languageService.t()('notifications.needAttention') }}</span>
          </div>
          <div class="stat-item unread" *ngIf="getUnreadCount() > 0">
            <mat-icon>mark_email_unread</mat-icon>
            <span>{{ getUnreadCount() }} {{ languageService.t()('notifications.unread') }}</span>
          </div>
          <div class="stat-item total">
            <mat-icon>list</mat-icon>
            <span>{{ notifications().length }} {{ languageService.t()('notifications.totalAlerts') }}</span>
          </div>
        </div>
        <div class="action-buttons">
          <button mat-raised-button color="primary" (click)="markAllRead()" *ngIf="getUnreadCount() > 0">
            <mat-icon>done_all</mat-icon>
            {{ languageService.t()('notifications.markAllRead') }}
          </button>
          <button mat-stroked-button (click)="refreshNotifications()" [disabled]="loading">
            <mat-icon>refresh</mat-icon>
            {{ languageService.t()('notifications.refresh') }}
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="!cacheReady">
        <mat-spinner diameter="40"></mat-spinner>
        <p>{{ languageService.t()('notifications.loadingFarmData') }}</p>
      </div>

      <!-- Notifications List -->
      <div class="notifications-list" *ngIf="cacheReady">
        <div *ngFor="let n of notifications(); trackBy: trackById" 
             class="notification-item" 
             [ngClass]="getNotificationClass(n)">
          
          <!-- Notification Icon -->
          <div class="notification-icon">
            <mat-icon [ngClass]="getIconClass(n)">{{ getFarmerIcon(n) }}</mat-icon>
          </div>

          <!-- Notification Content -->
          <div class="notification-content">
            <div class="notification-header">
              <h3>{{ getFarmerTitle(n) }}</h3>
              <span class="time">{{ getFarmerTime(n.createdAt) }}</span>
            </div>
            
            <div class="notification-message">
              <p>{{ getFarmerMessage(n) }}</p>
            </div>

            <div class="notification-action" *ngIf="getFarmerAction(n)">
              <div class="action-suggestion">
                <mat-icon>lightbulb</mat-icon>
                <span>{{ getFarmerAction(n) }}</span>
              </div>
            </div>

            <div class="notification-meta">
              <mat-chip [ngClass]="getPriorityChipClass(n)" size="small">
                {{ getFarmerPriority(n) }}
              </mat-chip>
              <span class="location" *ngIf="getLocation(n) as location">
                <mat-icon>location_on</mat-icon>
                {{ location }}
              </span>
            </div>
          </div>

          <!-- Notification Actions -->
          <div class="notification-actions">
            <button mat-icon-button 
                    (click)="markRead(n)" 
                    *ngIf="!n.read"
                    [matTooltip]="languageService.t()('notifications.markAsRead')">
              <mat-icon>check</mat-icon>
            </button>
            <button mat-icon-button 
                    (click)="remove(n)"
                    [matTooltip]="languageService.t()('notifications.dismiss')">
              <mat-icon>close</mat-icon>
            </button>
          </div>
        </div>
      </div>

      <!-- Load More Button -->
      <div class="load-more-section" *ngIf="hasMoreNotifications && !loading">
        <button mat-raised-button 
                color="primary" 
                (click)="loadMore()" 
                [disabled]="loadingMore"
                class="load-more-button">
          <mat-icon *ngIf="!loadingMore">expand_more</mat-icon>
          <mat-spinner *ngIf="loadingMore" diameter="20"></mat-spinner>
          {{ loadingMore ? languageService.t()('notifications.loading') : languageService.t()('notifications.showMoreNotifications') }}
        </button>
        <p class="load-more-info">
          {{ languageService.t()('notifications.showingNotifications', { current: list.length, total: total }) }}
        </p>
      </div>

      <!-- Empty State -->
      <div class="empty-state" *ngIf="!notifications().length">
        <mat-icon>check_circle</mat-icon>
        <h3>{{ languageService.t()('notifications.allGood') }}</h3>
        <p>{{ languageService.t()('notifications.noAlerts') }}</p>
        <div class="empty-tips">
          <h4><mat-icon>lightbulb</mat-icon> {{ languageService.t()('notifications.tip') }}</h4>
          <p>{{ languageService.t()('notifications.youWillGetNotified') }}</p>
          <ul>
            <li>{{ languageService.t()('notifications.temperatureHumidityOutsideRange') }}</li>
            <li>{{ languageService.t()('notifications.devicesNeedAttention') }}</li>
            <li>{{ languageService.t()('notifications.actionsSucceedFail') }}</li>
            <li>{{ languageService.t()('notifications.systemUpdates') }}</li>
          </ul>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .container { 
      max-width: 1000px; 
      margin: 24px auto; 
      padding: 0 16px; 
    }

    /* Header */
    .header {
      text-align: center;
      margin-bottom: 32px;
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

    /* Quick Actions */
    .quick-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 12px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .summary-stats {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 8px;
      font-weight: 500;
    }

    .stat-item.urgent {
      background: #ffebee;
      color: #c62828;
    }

    .stat-item.unread {
      background: #e3f2fd;
      color: #1565c0;
    }

    .stat-item.total {
      background: #e8f5e9;
      color: #2e7d32;
    }

    .stat-item mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .action-buttons {
      display: flex;
      gap: 12px;
      flex-shrink: 0;
    }

    .action-buttons button {
      border-radius: 8px;
      font-weight: 500;
    }

    /* Notifications List */
    .notifications-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .notification-item {
      display: flex;
      gap: 16px;
      padding: 20px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border-left: 4px solid #e0e0e0;
      transition: all 0.2s ease;
    }

    .notification-item:hover {
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      transform: translateY(-2px);
    }

    .notification-item.unread {
      border-left-color: #2e7d32;
      background: #fafafa;
    }

    .notification-item.urgent {
      border-left-color: #f44336;
      background: #fff8f8;
    }

    .notification-item.warning {
      border-left-color: #ff9800;
      background: #fffbf0;
    }

    .notification-item.success {
      border-left-color: #4caf50;
      background: #f8fff8;
    }

    /* Notification Icon */
    .notification-icon {
      flex-shrink: 0;
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .notification-icon mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .icon-urgent {
      background: #ffebee;
      color: #f44336;
    }

    .icon-warning {
      background: #fff3e0;
      color: #ff9800;
    }

    .icon-success {
      background: #e8f5e9;
      color: #4caf50;
    }

    .icon-info {
      background: #e3f2fd;
      color: #2196f3;
    }

    /* Notification Content */
    .notification-content {
      flex: 1;
      min-width: 0;
    }

    .notification-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
      gap: 16px;
    }

    .notification-header h3 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
      color: #333;
      line-height: 1.3;
    }

    .time {
      font-size: 0.85rem;
      color: #666;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .notification-message {
      margin-bottom: 12px;
    }

    .notification-message p {
      margin: 0;
      color: #555;
      line-height: 1.4;
    }

    .notification-action {
      margin-bottom: 12px;
    }

    .action-suggestion {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: #e8f5e9;
      border-radius: 8px;
      color: #2e7d32;
      font-size: 0.9rem;
    }

    .action-suggestion mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .notification-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .notification-meta mat-chip {
      font-size: 0.75rem;
      height: 24px;
      border-radius: 12px;
    }

    .priority-urgent {
      background: #ffebee;
      color: #c62828;
    }

    .priority-important {
      background: #fff3e0;
      color: #ef6c00;
    }

    .priority-normal {
      background: #e3f2fd;
      color: #1565c0;
    }

    .priority-low {
      background: #e8f5e9;
      color: #2e7d32;
    }

    .location {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.85rem;
      color: #666;
    }

    .location mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    /* Notification Actions */
    .notification-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex-shrink: 0;
    }

    /* Loading State */
    .loading-state {
      text-align: center;
      padding: 60px 20px;
      color: #666;
    }

    .loading-state mat-spinner {
      margin: 0 auto 16px auto;
    }

    .loading-state p {
      margin: 0;
      font-size: 1rem;
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #666;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .empty-state mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      margin-bottom: 16px;
      color: #4caf50;
    }

    .empty-state h3 {
      margin-bottom: 8px;
      color: #333;
      font-size: 1.5rem;
    }

    .empty-state p {
      margin-bottom: 24px;
      font-size: 1rem;
    }

    .empty-tips {
      text-align: left;
      max-width: 400px;
      margin: 0 auto;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .empty-tips h4 {
      margin: 0 0 12px 0;
      color: #333;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .empty-tips h4 mat-icon {
      color: #ff9800;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .empty-tips p {
      margin: 0 0 8px 0;
    }

    .empty-tips ul {
      margin: 0;
      padding-left: 20px;
    }

    .empty-tips li {
      margin-bottom: 4px;
      color: #555;
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

    /* Mobile Responsive */
    @media (max-width: 768px) {
      .notification-item {
        padding: 16px;
        gap: 12px;
      }

      .notification-icon {
        width: 40px;
        height: 40px;
      }

      .notification-icon mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      .notification-header {
        flex-direction: column;
        gap: 8px;
      }

      .time {
        align-self: flex-start;
      }

      .quick-actions {
        flex-direction: column;
        align-items: stretch;
      }

      .summary-stats {
        justify-content: center;
      }

      .action-buttons {
        justify-content: center;
        flex-wrap: wrap;
      }
    }
  `]
})
export class NotificationsComponent implements OnInit, OnDestroy {
  constructor() {
    console.log('🏗️ [NOTIFICATIONS] Component constructor called');
  }

  private svc = inject(NotificationService);
  private api = inject(ApiService);
  private farmManagement = inject(FarmManagementService);
  private dialog = inject(MatDialog);
  public languageService = inject(LanguageService);

  list: AppNotification[] = [];
  total = 0;
  pageSize = 20; // Show 20 notifications initially
  loading = false;
  loadingMore = false;
  hasMoreNotifications = false;
  cacheReady = false; // Track if cache is ready
  
  // Cache for farm-device mapping
  private farmDeviceCache = new Map<string, string>(); // deviceId -> farmName
  private deviceLocationCache = new Map<string, string>(); // deviceId -> deviceLocation

  async ngOnInit() {
    console.log('🏗️ [NOTIFICATIONS] ngOnInit called');
    
    // Check if notifications are already loaded
    if (this.list.length > 0) {
      console.log('🏗️ [NOTIFICATIONS] Notifications already loaded, skipping');
      return;
    }
    
    // Clear all caches first
    this.locationCache.clear();
    this.farmDeviceCache.clear();
    this.deviceLocationCache.clear();
    this.cacheReady = false;
    
    console.log('🏗️ [NOTIFICATIONS] Building farm device cache...');
    // Build cache first
    await this.buildFarmDeviceCache();
    
    console.log('🏗️ [NOTIFICATIONS] Cache ready:', this.cacheReady);
    // Only load notifications after cache is ready
    if (this.cacheReady) {
      console.log('🏗️ [NOTIFICATIONS] Loading notifications...');
      await this.load();
    } else {
      console.log('🏗️ [NOTIFICATIONS] Cache not ready, notifications not loaded');
    }
    
    // subscribe to live notifications and prepend if current user
    this.svc.newNotification$.subscribe(n => {
      console.log('🔔 [NOTIFICATIONS] New notification received:', n);
      // Clear location cache for this notification to force recomputation
      this.locationCache.delete(n.id);
      
      this.list = [n, ...this.list];
    });
  }

  ngOnDestroy() {
    // Component cleanup
  }

  private async buildFarmDeviceCache() {
    try {
      console.log('🏗️ [NOTIFICATIONS] Building farm device cache...');
      // Clear location cache when rebuilding
      this.locationCache.clear();
      
      const farms = await this.farmManagement.farms();
      console.log('🏗️ [NOTIFICATIONS] Farms from farm management:', farms);
      
      if (!farms || farms.length === 0) {
        console.log('🏗️ [NOTIFICATIONS] No farms from farm management, trying API...');
        // Try to get farms directly from API as fallback
        try {
          const directFarms = await this.api.getFarms().toPromise();
          console.log('🏗️ [NOTIFICATIONS] Farms from API:', directFarms);
          
          if (directFarms && directFarms.length > 0) {
            await this.processFarmsForCache(directFarms);
          } else {
            console.log('🏗️ [NOTIFICATIONS] No farms found, marking cache ready');
            this.cacheReady = true; // Mark as ready even if no farms
            return;
          }
        } catch (apiError) {
          console.error('🏗️ [NOTIFICATIONS] Error getting farms from API:', apiError);
          this.cacheReady = true; // Mark as ready even if no farms
          return;
        }
      } else {
        await this.processFarmsForCache(farms);
      }
      
      // Mark cache as ready
      this.cacheReady = true;
      console.log('🏗️ [NOTIFICATIONS] Farm device cache built successfully');
      
    } catch (error) {
      console.error('❌ [NOTIFICATIONS] Error building farm-device cache:', error);
      this.cacheReady = false;
    }
  }

  private async processFarmsForCache(farms: any[]) {
    for (const farm of farms) {
      try {
        const farmDevices = await this.api.getDevicesByFarm(farm.farm_id).toPromise();
        
        if (farmDevices && farmDevices.length > 0) {
          farmDevices.forEach(device => {
            // Cache farm name for device
            this.farmDeviceCache.set(device.device_id, farm.name);
            
            // Cache device location from database
            if (device.location) {
              this.deviceLocationCache.set(device.device_id, device.location);
            }
          });
        }
      } catch (deviceError) {
        console.error(`Error getting devices for farm ${farm.name}:`, deviceError);
      }
    }
  }

  async load(offset = 0, append = false) {
    if (!this.cacheReady) {
      console.log('🚫 [NOTIFICATIONS] Cache not ready, skipping load');
      return;
    }
    
    if (append) {
      this.loadingMore = true;
    } else {
      this.loading = true;
    }
    
    try {
      console.log('📡 [NOTIFICATIONS] Loading notifications from API...');
      const res = await this.api.getNotifications({ limit: this.pageSize, offset }).toPromise();
      console.log('📡 [NOTIFICATIONS] API response:', res);
      
      const items = res?.items ?? [];
      console.log('📡 [NOTIFICATIONS] Raw items:', items);
      
      const mappedItems = items.map((n: any) => ({
        id: n.id,
        level: n.level,
        title: n.title,
        message: n.message,
        createdAt: n.created_at || n.createdAt,
        read: !!(n.is_read ?? n.read),
        source: n.source,
        context: n.context,
      }));
      
      console.log('📡 [NOTIFICATIONS] Mapped items:', mappedItems);
      
      if (append) {
        // Append to existing list
        this.list = [...this.list, ...mappedItems];
      } else {
        // Replace list
        this.list = mappedItems;
      }
      
      this.total = res?.total ?? 0;
      this.hasMoreNotifications = this.list.length < this.total;
      
      console.log('📡 [NOTIFICATIONS] Final list length:', this.list.length);
      console.log('📡 [NOTIFICATIONS] Total notifications:', this.total);
      
    } catch (error) {
      console.error('❌ [NOTIFICATIONS] Error loading notifications:', error);
    } finally {
      this.loading = false;
      this.loadingMore = false;
    }
  }

  async loadMore() {
    if (this.loadingMore || !this.hasMoreNotifications) return;
    
    const currentOffset = this.list.length;
    await this.load(currentOffset, true);
  }

  async refreshNotifications() {
    await this.load(0, false); // Reload from beginning
  }

  notifications() { return this.list; }
  trackById(index: number, n: AppNotification) { return n.id; }

  // Farmer-friendly methods
  getUrgentCount(): number {
    return this.list.filter(n => n.level === 'critical').length;
  }

  getUnreadCount(): number {
    return this.list.filter(n => !n.read).length;
  }

  getNotificationClass(n: AppNotification): string {
    const classes = [];
    if (!n.read) classes.push('unread');
    if (n.level === 'critical') classes.push('urgent');
    else if (n.level === 'warning') classes.push('warning');
    else if (n.level === 'success') classes.push('success');
    return classes.join(' ');
  }

  getFarmerIcon(n: AppNotification): string {
    // Context-based icons for farmers
    if (n.source === 'sensor') {
      if (n.title?.toLowerCase().includes('temperature')) return 'thermostat';
      if (n.title?.toLowerCase().includes('humidity')) return 'water_drop';
      if (n.title?.toLowerCase().includes('light')) return 'wb_sunny';
      return 'sensors';
    }
    
    if (n.source === 'device') {
      if (n.title?.toLowerCase().includes('irrigation')) return 'water';
      if (n.title?.toLowerCase().includes('ventilator') || n.title?.toLowerCase().includes('fan')) return 'air';
      if (n.title?.toLowerCase().includes('heater')) return 'local_fire_department';
      return 'devices';
    }

    if (n.source === 'action') {
      if (n.level === 'critical') return 'error';
      if (n.level === 'success') return 'check_circle';
      return 'play_arrow';
    }

    // Default icons by level
    switch (n.level) {
      case 'critical': return 'warning';
      case 'warning': return 'info';
      case 'success': return 'check_circle';
      default: return 'notifications';
    }
  }

  getIconClass(n: AppNotification): string {
    switch (n.level) {
      case 'critical': return 'icon-urgent';
      case 'warning': return 'icon-warning';
      case 'success': return 'icon-success';
      default: return 'icon-info';
    }
  }

  getFarmerTitle(n: AppNotification): string {
    // Convert technical titles to farmer-friendly ones
    const title = n.title || '';
    
    // Temperature alerts
    if (title.includes('temperature') || title.includes('Temperature')) {
      if (title.includes('high') || title.includes('HIGH')) {
        return this.languageService.t()('notifications.temperatureTooHigh');
      }
      if (title.includes('low') || title.includes('LOW')) {
        return this.languageService.t()('notifications.temperatureTooLow');
      }
      return this.languageService.t()('notifications.temperatureAlert');
    }

    // Humidity alerts
    if (title.includes('humidity') || title.includes('Humidity')) {
      if (title.includes('high') || title.includes('HIGH')) {
        return this.languageService.t()('notifications.humidityTooHigh');
      }
      if (title.includes('low') || title.includes('LOW')) {
        return this.languageService.t()('notifications.humidityTooLow');
      }
      return this.languageService.t()('notifications.humidityAlert');
    }

    // Device alerts
    if (title.includes('device') || title.includes('Device')) {
      if (title.includes('offline') || title.includes('disconnected')) {
        return this.languageService.t()('notifications.deviceConnectionLost');
      }
      if (title.includes('online') || title.includes('connected')) {
        return this.languageService.t()('notifications.deviceConnected');
      }
      return this.languageService.t()('notifications.deviceUpdate');
    }

    // Action alerts
    if (title.includes('Action') || title.includes('action')) {
      if (title.includes('failed') || title.includes('error')) {
        return this.languageService.t()('notifications.actionFailed');
      }
      if (title.includes('success') || title.includes('executed')) {
        return this.languageService.t()('notifications.actionCompleted');
      }
      return this.languageService.t()('notifications.actionUpdate');
    }

    // System alerts
    if (title.includes('System') || title.includes('system')) {
      return this.languageService.t()('notifications.systemUpdate');
    }

    // Threshold warnings (common pattern)
    if (title.includes('threshold') || title.includes('Threshold') || title.includes('warning') || title.includes('Warning')) {
      return this.languageService.t()('notifications.thresholdWarning');
    }

    // Default: clean up the title
    return title.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  getFarmerMessage(n: AppNotification): string {
    const message = n.message || '';
    const title = n.title || '';
    
    // Temperature messages
    if (title.includes('temperature') || title.includes('Temperature')) {
      if (message.includes('°C') || message.includes('°F')) {
        const temp = message.match(/(\d+\.?\d*)\s*°[CF]/)?.[0];
        if (title.includes('high')) {
          return this.languageService.t()('notifications.temperatureHigh', { temp: temp });
        }
        if (title.includes('low')) {
          return this.languageService.t()('notifications.temperatureLow', { temp: temp });
        }
        return this.languageService.t()('notifications.temperatureNormal', { temp: temp });
      }
      return this.languageService.t()('notifications.temperatureAttention');
    }

    // Humidity messages
    if (title.includes('humidity') || title.includes('Humidity')) {
      if (message.includes('%')) {
        const humidity = message.match(/(\d+\.?\d*)\s*%/)?.[0];
        if (title.includes('high')) {
          return this.languageService.t()('notifications.humidityHigh', { humidity: humidity });
        }
        if (title.includes('low')) {
          return this.languageService.t()('notifications.humidityLow', { humidity: humidity });
        }
        return this.languageService.t()('notifications.humidityNormal', { humidity: humidity });
      }
      return this.languageService.t()('notifications.humidityAttention');
    }

    // Device messages
    if (title.includes('device') || title.includes('Device')) {
      if (message.includes('offline') || message.includes('disconnected')) {
        return this.languageService.t()('notifications.deviceOffline');
      }
      if (message.includes('online') || message.includes('connected')) {
        return this.languageService.t()('notifications.deviceOnline');
      }
      return this.languageService.t()('notifications.deviceUpdate');
    }

    // Action messages
    if (title.includes('Action') || title.includes('action')) {
      if (message.includes('failed') || message.includes('error')) {
        return this.languageService.t()('notifications.actionFailed');
      }
      if (message.includes('success') || message.includes('executed')) {
        return this.languageService.t()('notifications.actionSuccess');
      }
      return this.languageService.t()('notifications.actionUpdate');
    }

    // Clean up technical messages
    let cleanMessage = message
      .replace(/mqtt:/g, '')
      .replace(/smartfarm\//g, '')
      .replace(/actuators\//g, '')
      .replace(/sensors\//g, '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());

    return cleanMessage || this.languageService.t()('notifications.somethingHappened');
  }

  getFarmerAction(n: AppNotification): string | null {
    const title = n.title || '';
    const message = n.message || '';

    // Temperature actions
    if (title.includes('temperature') && title.includes('high')) {
      return 'Check if ventilation is working. Consider opening windows if it\'s cooler outside.';
    }
    if (title.includes('temperature') && title.includes('low')) {
      return 'Check if heating is working. Consider closing windows or adding insulation.';
    }

    // Humidity actions
    if (title.includes('humidity') && title.includes('high')) {
      return 'Improve air circulation. Check if dehumidifier is working properly.';
    }
    if (title.includes('humidity') && title.includes('low')) {
      return 'Check water levels. Consider misting plants or adding a humidifier.';
    }

    // Device actions
    if (title.includes('device') && (message.includes('offline') || message.includes('disconnected'))) {
      return 'Check device power and WiFi connection. Try restarting the device.';
    }

    // Action failures
    if (title.includes('Action') && message.includes('failed')) {
      return 'Try the action again in a few minutes. Check if the device is responding.';
    }

    return null;
  }

  getFarmerTime(dateStr: string): string {
    if (!dateStr) return '';
    
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    // For older notifications, show the actual date
    return date.toLocaleDateString();
  }

  getFarmerPriority(n: AppNotification): string {
    switch (n.level) {
      case 'critical': return this.languageService.t()('notifications.urgent');
      case 'warning': return this.languageService.t()('notifications.important');
      case 'success': return this.languageService.t()('notifications.success');
      default: return this.languageService.t()('notifications.normal');
    }
  }

  getPriorityChipClass(n: AppNotification): string {
    switch (n.level) {
      case 'critical': return 'priority-urgent';
      case 'warning': return 'priority-important';
      case 'success': return 'priority-low';
      default: return 'priority-normal';
    }
  }

  extractDeviceIdFromMessage(message: string): string | null {
    if (!message) return null;
    
    // First, try to find exact matches from our cache
    const cacheKeys = Array.from(this.farmDeviceCache.keys());
    for (const deviceId of cacheKeys) {
      if (message.includes(deviceId)) {
        return deviceId;
      }
    }
    
    // Try to match partial device IDs from cache (e.g., "dht11" -> "dht11H")
    const extractedId = this.extractPartialDeviceId(message);
    if (extractedId) {
      // Try to find a matching device ID in cache that starts with this partial ID
      for (const deviceId of cacheKeys) {
        if (deviceId.toLowerCase().startsWith(extractedId.toLowerCase())) {
          return deviceId;
        }
      }
      
      // If no match found, return the partial ID
      return extractedId;
    }
    
    return null;
  }

  private extractPartialDeviceId(message: string): string | null {
    // Look for device IDs in the message (e.g., "dht11H • lights_on")
    const deviceIdMatch = message.match(/([a-zA-Z0-9]+[Hh]?)\s*[•·]\s*/);
    if (deviceIdMatch) {
      return deviceIdMatch[1];
    }
    
    // Look for device IDs at the beginning of the message (more specific pattern)
    const startMatch = message.match(/^([a-zA-Z0-9]+[Hh]?)\s*\(/);
    if (startMatch) {
      return startMatch[1];
    }
    
    // Fallback: look for device IDs at the beginning without parenthesis
    const fallbackMatch = message.match(/^([a-zA-Z0-9]+[Hh]?)/);
    if (fallbackMatch) {
      return fallbackMatch[1];
    }
    
    return null;
  }

  // Cache for computed locations
  private locationCache = new Map<string, string>(); // notificationId -> location

  getLocation(n: AppNotification): string | null {
    // Check if cache is ready
    if (!this.cacheReady) {
      return null;
    }
    
    // Check if we already computed this location
    if (this.locationCache.has(n.id)) {
      const cached = this.locationCache.get(n.id)!;
      
      // If cached location is wrong (starts with "Device"), recompute it
      if (cached.startsWith('Device ')) {
        this.locationCache.delete(n.id);
        // Fall through to recompute
      } else {
        return cached;
      }
    }
    
    // Extract device ID from notification
    const notificationDeviceId = n.context?.deviceId || 
                               n.context?.device_id ||
                               this.extractDeviceIdFromMessage(n.message || '');
    
    if (!notificationDeviceId) {
      // For system notifications without device ID
      this.locationCache.set(n.id, 'System');
      return 'System';
    }
    
    // Get farm name and device location from cache
    const farmName = this.farmDeviceCache.get(notificationDeviceId);
    const deviceLocation = this.deviceLocationCache.get(notificationDeviceId);
    
    let result: string;
    if (farmName && deviceLocation) {
      result = `${farmName} - ${deviceLocation}`;
    } else if (farmName) {
      result = farmName;
    } else if (deviceLocation) {
      result = deviceLocation;
    } else {
      // Fallback: show device ID
      result = `Device ${notificationDeviceId}`;
    }
    
    // Cache the result
    this.locationCache.set(n.id, result);
    return result;
  }

  async markRead(n: AppNotification) {
    await this.api.markNotificationsRead([n.id]).toPromise();
    n.read = true;
    this.svc.decrementUnread(1);
  }

  async remove(n: AppNotification) {
    const ref = this.dialog.open(ConfirmDeleteDialogComponent, { width: '360px' });
    const confirmed = await ref.afterClosed().toPromise();
    if (!confirmed) return;
    await this.api.deleteNotification(n.id).toPromise();
    this.list = this.list.filter(x => x.id !== n.id);
  }

  async markAllRead() {
    await this.api.markAllNotificationsRead().toPromise();
    this.list = this.list.map(n => ({ ...n, read: true }));
    this.svc.setUnreadCountFromApi(0);
  }
}
