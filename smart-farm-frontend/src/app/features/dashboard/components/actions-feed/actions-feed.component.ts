import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../../../core/services/api.service';
import { FarmManagementService } from '../../../../core/services/farm-management.service';
import { ActionLog } from '../../../../core/models/action-log.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Router } from '@angular/router';
import { LanguageService } from '../../../../core/services/language.service';

@Component({
  selector: 'app-actions-feed',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatChipsModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
  <mat-card>
    <mat-card-header>
      <mat-card-title>{{ languageService.t()('actions.recentActions') }}</mat-card-title>
    </mat-card-header>
    <mat-card-content>
      <div class="feed" *ngIf="actions().length; else empty">
        <div class="item" *ngFor="let a of actions()">
          <div class="meta">
            <span class="time">{{ a.created_at | date:'short' }}</span>
            <mat-chip [ngClass]="'status-' + a.status">{{ getStatusText(a.status) }}</mat-chip>
            <mat-chip [ngClass]="'source-' + a.trigger_source">{{ getSourceText(a.trigger_source) }}</mat-chip>
          </div>
          <div class="line">
            <mat-icon>router</mat-icon>
            <span>{{ getDeviceDisplayName(a.device_id) }}</span>
          </div>
          <div class="line" *ngIf="a.sensor_id">
            <mat-icon>sensors</mat-icon>
            <span>{{ getSensorDisplayName(a.sensor_type, a.sensor_id) }}</span>
          </div>
          <div class="line" *ngIf="a.value != null">
            <mat-icon>speed</mat-icon>
            <span>{{ getValueDisplay(a.value, a.unit) }}</span>
          </div>
          <div class="line">
            <mat-icon>play_circle</mat-icon>
            <span>{{ getActionDisplayName(a.action_uri) }}</span>
          </div>
          <div class="error" *ngIf="a.status === 'error' && a.error_message">
            <mat-icon>error</mat-icon>
            <span>{{ a.error_message }}</span>
          </div>
        </div>
        
        <!-- Load More Button -->
        <div class="load-more-section" *ngIf="hasMoreActions() && !loading()">
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
      <ng-template #empty>
        <div class="empty" *ngIf="!hasAuthError">{{ languageService.t()('actions.noRecentActions') }}</div>
        <div class="auth-error" *ngIf="hasAuthError">
          <mat-icon>lock</mat-icon>
          <h3>{{ languageService.t()('auth.authenticationRequired') }}</h3>
          <p>{{ languageService.t()('auth.loginToViewActions') }}</p>
          <button mat-raised-button color="primary" (click)="goToLogin()">
            <mat-icon>login</mat-icon>
            {{ languageService.t()('auth.login') }}
          </button>
        </div>
      </ng-template>
    </mat-card-content>
  </mat-card>
  `,
  styles: [`
    .feed { display: flex; flex-direction: column; gap: 12px; }
    .item { padding: 8px 0; border-bottom: 1px solid #eee; }
    .item:last-child { border-bottom: none; }
    .meta { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .line { display: flex; align-items: center; gap: 6px; color: #555; }
    .topic { font-family: monospace; }
    .status-queued { background: #e0f2f1; }
    .status-sent { background: #e8f5e9; }
    .status-ack { background: #e3f2fd; }
    .status-error { background: #ffebee; }
    .source-auto { background: #ede7f6; }
    .source-manual { background: #fff3e0; }
    .error { color: #c62828; display: flex; align-items: center; gap: 6px; margin-top: 6px; }
    .empty { color: #777; }
    .auth-error { 
      text-align: center; 
      padding: 40px 20px; 
      color: #666; 
    }
    .auth-error mat-icon { 
      font-size: 48px; 
      width: 48px; 
      height: 48px; 
      margin-bottom: 16px; 
      color: #f57c00; 
    }
    .auth-error h3 { 
      margin: 0 0 8px 0; 
      color: #333; 
    }
    .auth-error p { 
      margin: 0 0 24px 0; 
    }
    
    /* Load More Section */
    .load-more-section {
      text-align: center;
      padding: 20px;
      margin-top: 16px;
    }

    .load-more-button {
      border-radius: 8px;
      font-weight: 500;
      padding: 8px 16px;
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 0 auto 8px auto;
    }

    .load-more-button mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .load-more-button mat-spinner {
      margin-right: 6px;
    }

    .load-more-info {
      margin: 0;
      color: #666;
      font-size: 0.85rem;
    }
  `]
})
export class ActionsFeedComponent implements OnInit {
  actions = signal<ActionLog[]>([]);
  hasAuthError = signal<boolean>(false);
  loading = signal<boolean>(false);
  loadingMore = signal<boolean>(false);
  totalActions = signal<number>(0);
  hasMoreActions = signal<boolean>(false);
  pageSize = 10; // Show 10 recent actions initially
  
  private api = inject(ApiService);
  private farmManagement = inject(FarmManagementService);
  private notifications = inject(NotificationService);
  private auth = inject(AuthService);
  private router = inject(Router);
  public languageService = inject(LanguageService);

  async ngOnInit() {
    await this.reload();
    setInterval(() => this.reload(), 15000);
    
    // Subscribe to farm selection changes
    this.farmManagement.selectedFarm$.subscribe(selectedFarm => {
      if (selectedFarm) {
        console.log('🏡 [ACTIONS-FEED] Farm changed, reloading data for:', selectedFarm.name);
        this.reload();
      }
    });
  }

  private async reload(offset = 0, append = false) {
    try {
      // Check if user is authenticated
      if (!this.auth.isAuthenticated()) {
        this.hasAuthError.set(true);
        return;
      }

      const selectedFarm = this.farmManagement.getSelectedFarm();
      if (!selectedFarm) {
        console.log('⚠️ [ACTIONS-FEED] No farm selected, skipping actions load');
        this.loading.set(false);
        this.loadingMore.set(false);
        return;
      }

      if (append) {
        this.loadingMore.set(true);
      } else {
        this.loading.set(true);
      }

      this.hasAuthError.set(false);
      
      // Get devices for selected farm to filter actions
      const farmDevices = await this.api.getDevicesByFarm(selectedFarm.farm_id).toPromise();
      const farmDeviceIds = farmDevices?.map(device => device.device_id) || [];
      
      console.log('🏡 [ACTIONS-FEED] Loading actions for farm:', selectedFarm.name, 'Devices:', farmDeviceIds);
      
      // Load actions for each device separately since backend doesn't support multiple device_ids
      let allActions: any[] = [];
      let totalCount = 0;
      
      for (const deviceId of farmDeviceIds) {
        const res = await this.api.getActions({ 
          limit: 50, // Get more per device to ensure we have enough
          offset: 0,
          device_id: deviceId
        }).toPromise();
        
        if (res?.items) {
          allActions = [...allActions, ...res.items];
          totalCount += res.total || 0;
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

      // Emit notifications for action outcomes using rate limiting
      for (const a of paginatedActions) {
        const key = `action:${a.device_id}:${a.status}:${a.action_uri}`;
        if (a.status === 'error') {
          if (this.notifications.shouldNotify(key, 'critical')) {
            this.notifications.notify('critical', 'Action failed', `${a.device_id} • ${a.action_uri}`, { source: 'action', context: a });
          }
        } else if (a.status === 'sent' || a.status === 'ack') {
          if (this.notifications.shouldNotify(key, 'success')) {
            this.notifications.notify('success', 'Action executed', `${a.device_id} • ${a.action_uri}`, { source: 'action', context: a });
          }
        }
      }
    } catch (e: any) {
      console.error('Error loading actions:', e);
      // Check if it's an authentication error
      if (e?.status === 401 || e?.error?.message === 'Unauthorized') {
        this.hasAuthError.set(true);
        this.auth.logout(); // Clear invalid token
      }
    } finally {
      this.loading.set(false);
      this.loadingMore.set(false);
    }
  }

  async loadMoreActions() {
    if (this.loadingMore() || !this.hasMoreActions()) return;
    
    const currentOffset = this.actions().length;
    await this.reload(currentOffset, true);
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  getActionName(actionUri: string): string {
    if (!actionUri) return '';
    const parts = actionUri.split('/');
    return parts[parts.length - 1].replace(/_/g, ' ');
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

  getSourceText(source: string): string {
    switch (source) {
      case 'auto': return this.languageService.t()('actions.automatic');
      case 'manual': return this.languageService.t()('actions.manual');
      default: return source;
    }
  }

  getDeviceDisplayName(deviceId: string): string {
    // Translate common device names/IDs
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

  getSensorDisplayName(sensorType: string | null | undefined, sensorId: string | null | undefined): string {
    if (!sensorType || !sensorId) return sensorId || '';
    
    // Translate sensor type if possible
    const translatedType = this.getSensorTypeTranslation(sensorType);
    return `${translatedType} (${sensorId})`;
  }

  getValueDisplay(value: number | null | undefined, unit: string | null | undefined): string {
    if (value == null) return '';
    if (!unit) return value.toString();
    
    // Translate unit if possible
    const translatedUnit = this.getUnitTranslation(unit);
    return `${value}${translatedUnit}`;
  }

  getActionDisplayName(actionUri: string): string {
    if (!actionUri) return '';
    
    const actionName = this.getActionName(actionUri);
    // Translate common action names
    return this.getActionNameTranslation(actionName);
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
}

