import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ApiService } from '../../../../core/services/api.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { FarmManagementService } from '../../../../core/services/farm-management.service';
import { LanguageService } from '../../../../core/services/language.service';
import { Device, Farm, DeviceStatus } from '../../../../core/models/farm.model';
import { ExecuteActionRequest } from '../../../../core/models/action-log.model';
import { Subject, takeUntil } from 'rxjs';

interface ActionTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  actionUri: string;
  actionType: 'critical' | 'important' | 'normal';
  category: string;
}

interface PendingAction {
  actionId: string;
  deviceId: string;
  actionName: string;
  status: 'pending' | 'success' | 'failed' | 'timeout';
  timestamp: Date;
  error?: string;
}

@Component({
  selector: 'app-manual-actions-v2',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatSnackBarModule,
    MatBadgeModule,
    MatTooltipModule
  ],
  template: `
    <div class="manual-actions-container">
      <!-- Header -->
      <div class="header">
        <h2>🎮 {{ languageService.t()('manualControl.title') }}</h2>
        <p>{{ languageService.t()('manualControl.subtitle') }}</p>
      </div>

      <!-- Quick Stats -->
      <div class="stats-grid">
        <mat-card class="stat-card">
          <mat-icon>devices</mat-icon>
          <div class="stat-content">
            <span class="stat-number">{{ onlineDevicesCount() }}</span>
            <span class="stat-label">{{ languageService.t()('manualControl.onlineDevices') }}</span>
          </div>
        </mat-card>
        
        <mat-card class="stat-card" *ngIf="pendingActionsCount() > 0">
          <mat-icon>schedule</mat-icon>
          <div class="stat-content">
            <span class="stat-number">{{ pendingActionsCount() }}</span>
            <span class="stat-label">{{ languageService.t()('manualControl.pendingActions') }}</span>
          </div>
        </mat-card>
      </div>

      <!-- Pending Actions -->
      <mat-card *ngIf="pendingActionsCount() > 0" class="pending-actions-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>schedule</mat-icon>
            {{ languageService.t()('manualControl.pendingActions') }} ({{ pendingActionsCount() }})
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="pending-actions-list">
            <div *ngFor="let action of pendingActionsArray()" class="pending-action-item">
              <div class="action-info">
                <mat-icon class="action-icon">{{ getActionIcon(action.actionName) }}</mat-icon>
                <div class="action-details">
                  <h4>{{ getActionNameTranslation(action.actionName) }}</h4>
                  <p>{{ getDeviceDisplayName(action.deviceId) }} • {{ action.timestamp | date:'short' }}</p>
                </div>
              </div>
              <div class="action-status">
                <mat-spinner *ngIf="action.status === 'pending'" diameter="24"></mat-spinner>
                <mat-icon *ngIf="action.status === 'success'" class="status-success">check_circle</mat-icon>
                <mat-icon *ngIf="action.status === 'failed'" class="status-error">error</mat-icon>
                <mat-icon *ngIf="action.status === 'timeout'" class="status-warning">schedule</mat-icon>
                <mat-chip [color]="getStatusColor(action.status)">
                  {{ getStatusText(action.status) }}
                </mat-chip>
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Device Actions -->
      <div class="devices-grid">
        <mat-card *ngFor="let device of devices()" class="device-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>{{ getDeviceIcon(device) }}</mat-icon>
              {{ getDeviceDisplayName(device.name) }}
            </mat-card-title>
            <mat-card-subtitle>
              <mat-chip [color]="(device.status === DeviceStatus.ONLINE || device.status === DeviceStatus.ACTIVE) ? 'accent' : 'warn'">
                {{ getDeviceStatusTranslation(device.status) }}
              </mat-chip>
            </mat-card-subtitle>
          </mat-card-header>
          
          <mat-card-content>
            <div class="actions-grid">
              <button 
                *ngFor="let action of getActionsForDevice(device)" 
                mat-raised-button
                [color]="getActionColor(action.actionType)"
                [disabled]="isActionExecuting(action.id) || (device.status !== DeviceStatus.ONLINE && device.status !== DeviceStatus.ACTIVE)"
                (click)="executeAction(device, action)"
                class="action-button"
                [matTooltip]="action.description">
                
                <mat-icon *ngIf="!isActionExecuting(action.id)">{{ action.icon }}</mat-icon>
                <mat-spinner *ngIf="isActionExecuting(action.id)" diameter="20"></mat-spinner>
                <span>{{ getActionNameTranslation(action.name) }}</span>
              </button>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .manual-actions-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .header {
      text-align: center;
      margin-bottom: 32px;
    }

    .header h2 {
      margin: 0 0 8px 0;
      color: #2e7d32;
    }

    .header p {
      margin: 0;
      color: #666;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      display: flex;
      align-items: center;
      padding: 16px;
      gap: 16px;
    }

    .stat-card mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: #2e7d32;
    }

    .stat-content {
      display: flex;
      flex-direction: column;
    }

    .stat-number {
      font-size: 24px;
      font-weight: bold;
      color: #2e7d32;
    }

    .stat-label {
      font-size: 14px;
      color: #666;
    }

    .pending-actions-card {
      margin-bottom: 24px;
    }

    .pending-actions-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .pending-action-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      background: #fafafa;
    }

    .action-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .action-icon {
      color: #2e7d32;
    }

    .action-details h4 {
      margin: 0;
      font-size: 16px;
    }

    .action-details p {
      margin: 0;
      font-size: 14px;
      color: #666;
    }

    .action-status {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .status-success { color: #4caf50; }
    .status-error { color: #f44336; }
    .status-warning { color: #ff9800; }

    .devices-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 24px;
    }

    .device-card {
      min-height: 300px;
    }

    .device-card mat-card-header {
      margin-bottom: 16px;
    }

    .device-card mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
    }

    .action-button {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 16px 8px;
      min-height: 80px;
    }

    .action-button mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .action-button span {
      font-size: 12px;
      text-align: center;
      line-height: 1.2;
    }

    @media (max-width: 768px) {
      .manual-actions-container {
        padding: 16px;
      }

      .devices-grid {
        grid-template-columns: 1fr;
      }

      .actions-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `]
})
export class ManualActionsV2Component implements OnInit, OnDestroy {
  private apiService = inject(ApiService);
  private notificationService = inject(NotificationService);
  private farmManagement = inject(FarmManagementService);
  private snackBar = inject(MatSnackBar);
  public languageService = inject(LanguageService);
  private destroy$ = new Subject<void>();

  // Expose enum for template access
  DeviceStatus = DeviceStatus;

  // Signals
  devices = signal<Device[]>([]);
  farms = signal<Farm[]>([]);
  deviceActions = signal<Map<string, ActionTemplate[]>>(new Map()); // deviceId -> actions
  pendingActions = signal<Map<string, PendingAction>>(new Map());
  executingActions = signal<Set<string>>(new Set()); // execution IDs
  executingTemplates = signal<Set<string>>(new Set()); // template IDs

  // Computed
  onlineDevicesCount = computed(() => {
    const devices = this.devices();
    const onlineDevices = devices.filter(d => d.status === DeviceStatus.ONLINE || d.status === DeviceStatus.ACTIVE);
    console.log('🔍 [MANUAL-ACTIONS-V2] Computing online devices:', {
      totalDevices: devices.length,
      onlineDevices: onlineDevices.length,
      deviceStatuses: devices.map(d => ({ id: d.device_id, name: d.name, status: d.status }))
    });
    return onlineDevices.length;
  });
  
  pendingActionsCount = computed(() => this.pendingActions().size);
  
  pendingActionsArray = computed(() => Array.from(this.pendingActions().values()));

  // Dynamic actions are now loaded from the backend based on sensor configurations

  ngOnInit(): void {
    this.loadData();
    this.setupWebSocketListeners();
    
    // Subscribe to farm selection changes
    this.farmManagement.selectedFarm$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(selectedFarm => {
      if (selectedFarm) {
        console.log('🏡 [MANUAL-ACTIONS-V2] Farm changed, reloading data for:', selectedFarm.name);
        this.loadData();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadData(): Promise<void> {
    try {
      console.log('🔄 [MANUAL-ACTIONS-V2] Loading data...');
      
      const selectedFarm = this.farmManagement.getSelectedFarm();
      if (!selectedFarm) {
        console.log('⚠️ [MANUAL-ACTIONS-V2] No farm selected, skipping data load');
        return;
      }
      
      console.log('🏡 [MANUAL-ACTIONS-V2] Loading data for farm:', selectedFarm.name);
      
      // Load devices for selected farm only
      const devices = await this.apiService.getDevicesByFarm(selectedFarm.farm_id).toPromise();
      
      console.log('📊 [MANUAL-ACTIONS-V2] Loaded devices for farm:', devices);
      
      this.devices.set(devices || []);
      
      // Load actions for each device
      await this.loadDeviceActions(devices || []);
      
      console.log('✅ [MANUAL-ACTIONS-V2] Data loaded successfully. Devices count:', this.devices().length);
      console.log('🔍 [MANUAL-ACTIONS-V2] Online devices count:', this.onlineDevicesCount());
      
    } catch (error) {
      console.error('❌ [MANUAL-ACTIONS-V2] Error loading data:', error);
      this.snackBar.open(this.languageService.t()('manualControl.loadDevicesError'), this.languageService.t()('common.close'), { duration: 3000 });
    }
  }

  private async loadDeviceActions(devices: Device[]): Promise<void> {
    try {
      console.log('🔄 [MANUAL-ACTIONS-V2] Loading device actions...');
      
      const actionsMap = new Map<string, ActionTemplate[]>();
      
      // Load actions for each device
      for (const device of devices) {
        try {
          const actions = await this.apiService.getDeviceActions(device.device_id).toPromise();
          console.log(`📋 [MANUAL-ACTIONS-V2] Loaded ${actions?.length || 0} actions for device ${device.device_id}:`, actions);
          actionsMap.set(device.device_id, actions || []);
        } catch (error) {
          console.error(`❌ [MANUAL-ACTIONS-V2] Error loading actions for device ${device.device_id}:`, error);
          actionsMap.set(device.device_id, []);
        }
      }
      
      this.deviceActions.set(actionsMap);
      console.log('✅ [MANUAL-ACTIONS-V2] Device actions loaded successfully');
      
    } catch (error) {
      console.error('❌ [MANUAL-ACTIONS-V2] Error loading device actions:', error);
    }
  }

  private setupWebSocketListeners(): void {
    this.notificationService.initSocket();
    console.log('🔧 [MANUAL-ACTIONS-V2] Setting up WebSocket listeners...');

    // Listen for action acknowledgments
    this.notificationService.actionAcknowledged$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        console.log('🎯 [MANUAL-ACTIONS-V2] Action acknowledged:', data);
        this.updateActionStatus(data.actionId, 'success');
      });

    // Listen for action failures
    this.notificationService.actionFailed$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        console.log('❌ [MANUAL-ACTIONS-V2] Action failed:', data);
        this.updateActionStatus(data.actionId, 'failed', data.error);
      });

    // Listen for action timeouts
    this.notificationService.actionTimeout$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        console.log('⏰ [MANUAL-ACTIONS-V2] Action timeout:', data);
        this.updateActionStatus(data.actionId, 'timeout');
      });
  }

  async executeAction(device: Device, action: ActionTemplate): Promise<void> {
    const actionId = `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('📤 [MANUAL-ACTIONS-V2] Executing action:', { actionId, device: device.device_id, action: action.name });

    // Add to executing actions (use execution ID, not template ID)
    this.executingActions.update(actions => new Set([...actions, actionId]));
    
    // Add template ID to executing templates
    this.executingTemplates.update(templates => new Set([...templates, action.id]));

    // Add to pending actions
    this.addPendingAction(actionId, device.device_id, action.name);

    try {
      const request: ExecuteActionRequest = {
        deviceId: device.device_id,
        action: action.actionUri.replace('{device_id}', device.device_id),
        actionId: actionId,
        actionType: action.actionType,
        context: {
          sensorId: 'manual_trigger',
          sensorType: 'manual',
          value: 0,
          unit: '',
          violationType: 'manual'
        }
      };

      await this.apiService.executeAction(request).toPromise();
      
      this.snackBar.open(
        this.languageService.t()('manualControl.actionSentMessage', { actionName: this.getActionNameTranslation(action.name) }), 
        this.languageService.t()('common.close'), 
        { duration: 3000 }
      );

    } catch (error) {
      console.error('Error executing action:', error);
      this.snackBar.open(
        this.languageService.t()('manualControl.actionFailedMessage', { actionName: this.getActionNameTranslation(action.name) }), 
        this.languageService.t()('common.close'), 
        { duration: 3000 }
      );
      
      // Remove from executing and pending on error
      this.executingActions.update(actions => {
        const newSet = new Set(actions);
        newSet.delete(actionId);
        return newSet;
      });
      
      this.executingTemplates.update(templates => {
        const newSet = new Set(templates);
        newSet.delete(action.id);
        return newSet;
      });
      
      this.pendingActions.update(actions => {
        const newMap = new Map(actions);
        newMap.delete(actionId);
        return newMap;
      });
    }
  }

  private addPendingAction(actionId: string, deviceId: string, actionName: string): void {
    const pendingAction: PendingAction = {
      actionId,
      deviceId,
      actionName,
      status: 'pending',
      timestamp: new Date()
    };

    this.pendingActions.update(actions => {
      const newMap = new Map(actions);
      newMap.set(actionId, pendingAction);
      return newMap;
    });

    // Set timeout for 30 seconds
    setTimeout(() => {
      this.updateActionStatus(actionId, 'timeout');
    }, 30000);
  }

  private updateActionStatus(actionId: string, status: 'success' | 'failed' | 'timeout', error?: string): void {
    console.log('🔄 [MANUAL-ACTIONS-V2] Updating action status:', { actionId, status, error });

    this.pendingActions.update(actions => {
      const newMap = new Map(actions);
      const action = newMap.get(actionId);
      
      if (action) {
        action.status = status;
        if (error) action.error = error;
        newMap.set(actionId, action);
        
        // Remove from executing actions
        this.executingActions.update(executing => {
          const newSet = new Set(executing);
          newSet.delete(actionId);
          return newSet;
        });
        
        // Remove from executing templates - find the template ID from deviceActions
        for (const [deviceId, actions] of this.deviceActions().entries()) {
          const matchingAction = actions.find(a => 
            a.name.toLowerCase() === action.actionName.toLowerCase() ||
            a.actionUri.includes(action.actionName.toLowerCase().replace(' ', '_'))
          );
          if (matchingAction) {
            this.executingTemplates.update(templates => {
              const newSet = new Set(templates);
              newSet.delete(matchingAction.id);
              return newSet;
            });
            break;
          }
        }

        // Show notification
        const message = status === 'success' 
          ? this.languageService.t()('manualControl.actionSuccessMessage', { actionName: this.getActionNameTranslation(action.actionName) })
          : status === 'failed'
          ? this.languageService.t()('manualControl.actionFailedMessage', { actionName: this.getActionNameTranslation(action.actionName), error: error || this.languageService.t()('common.unknownError') })
          : this.languageService.t()('manualControl.actionTimeoutMessage', { actionName: this.getActionNameTranslation(action.actionName) });
          
        this.snackBar.open(message, this.languageService.t()('common.close'), { 
          duration: status === 'success' ? 3000 : 5000,
          panelClass: status === 'success' ? 'success-snackbar' : 'error-snackbar'
        });

        // Remove from pending after showing status for 2 seconds
        setTimeout(() => {
          this.pendingActions.update(pendingActions => {
            const updatedMap = new Map(pendingActions);
            updatedMap.delete(actionId);
            return updatedMap;
          });
        }, 2000);
      } else {
        console.warn('⚠️ [MANUAL-ACTIONS-V2] Action not found for ID:', actionId);
      }
      
      return newMap;
    });
  }

  getActionsForDevice(device: Device): ActionTemplate[] {
    // Return dynamic actions for this specific device
    return this.deviceActions().get(device.device_id) || [];
  }

  isActionExecuting(actionTemplateId: string): boolean {
    return this.executingTemplates().has(actionTemplateId);
  }

  getDeviceIcon(device: Device): string {
    return 'sensors';
  }

  getActionIcon(actionName: string): string {
    const name = actionName.toLowerCase();
    if (name.includes('irrigation') || name.includes('water')) return 'water_drop';
    if (name.includes('fan') || name.includes('ventil')) return 'air';
    if (name.includes('heat')) return 'local_fire_department';
    if (name.includes('light')) return 'lightbulb';
    if (name.includes('roof')) return 'open_in_full';
    if (name.includes('restart')) return 'restart_alt';
    if (name.includes('calibrate')) return 'tune';
    return 'smart_toy';
  }

  getActionColor(actionType: string): 'primary' | 'accent' | 'warn' {
    switch (actionType) {
      case 'critical': return 'warn';
      case 'important': return 'accent';
      default: return 'primary';
    }
  }

  getStatusColor(status: string): 'primary' | 'accent' | 'warn' {
    switch (status) {
      case 'success': return 'accent';
      case 'failed': return 'warn';
      case 'timeout': return 'warn';
      default: return 'primary';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'pending': return this.languageService.t()('manualControl.statusPending');
      case 'success': return this.languageService.t()('manualControl.statusSuccess');
      case 'failed': return this.languageService.t()('manualControl.statusFailed');
      case 'timeout': return this.languageService.t()('manualControl.statusTimeout');
      default: return status;
    }
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
      'light off': this.languageService.t()('actions.actionTypes.lightOff'),
      'pump on': this.languageService.t()('actions.actionTypes.waterPumpOn'),
      'pump off': this.languageService.t()('actions.actionTypes.waterPumpOff'),
      'turn on': this.languageService.t()('actions.actionTypes.turnOnLight'),
      'turn off': this.languageService.t()('actions.actionTypes.turnOffLight'),
      // Additional patterns for common variations
      'waterpump on': this.languageService.t()('actions.actionTypes.waterPumpOn'),
      'waterpump off': this.languageService.t()('actions.actionTypes.waterPumpOff'),
      'water_pump on': this.languageService.t()('actions.actionTypes.waterPumpOn'),
      'water_pump off': this.languageService.t()('actions.actionTypes.waterPumpOff'),
      'light_on': this.languageService.t()('actions.actionTypes.lightOn'),
      'light_off': this.languageService.t()('actions.actionTypes.lightOff'),
      'pump_on': this.languageService.t()('actions.actionTypes.waterPumpOn'),
      'pump_off': this.languageService.t()('actions.actionTypes.waterPumpOff')
    };
    
    // Try exact match first
    let translatedName = actionMap[actionName.toLowerCase()];
    if (translatedName) {
      return translatedName;
    }
    
    // Handle complex action names with context (e.g., "Ventilator Off (temperature Low)")
    const lowerActionName = actionName.toLowerCase();
    
    // Extract the main action from complex names
    if (lowerActionName.includes('ventilator off')) {
      return this.languageService.t()('actions.actionTypes.ventilatorOff');
    }
    if (lowerActionName.includes('ventilator on')) {
      return this.languageService.t()('actions.actionTypes.ventilatorOn');
    }
    if (lowerActionName.includes('humidifier on')) {
      return this.languageService.t()('actions.actionTypes.humidifierOn');
    }
    if (lowerActionName.includes('humidifier off')) {
      return this.languageService.t()('actions.actionTypes.humidifierOff');
    }
    if (lowerActionName.includes('open roof')) {
      return this.languageService.t()('actions.actionTypes.openRoof');
    }
    if (lowerActionName.includes('close roof')) {
      return this.languageService.t()('actions.actionTypes.closeRoof');
    }
    if (lowerActionName.includes('water pump on')) {
      return this.languageService.t()('actions.actionTypes.waterPumpOn');
    }
    if (lowerActionName.includes('water pump off')) {
      return this.languageService.t()('actions.actionTypes.waterPumpOff');
    }
    if (lowerActionName.includes('light on')) {
      return this.languageService.t()('actions.actionTypes.lightOn');
    }
    if (lowerActionName.includes('light off')) {
      return this.languageService.t()('actions.actionTypes.lightOff');
    }
    
    // Try partial matches for complex action names
    if (lowerActionName.includes('water') && lowerActionName.includes('pump') && lowerActionName.includes('on')) {
      return this.languageService.t()('actions.actionTypes.waterPumpOn');
    }
    if (lowerActionName.includes('water') && lowerActionName.includes('pump') && lowerActionName.includes('off')) {
      return this.languageService.t()('actions.actionTypes.waterPumpOff');
    }
    if (lowerActionName.includes('light') && lowerActionName.includes('on')) {
      return this.languageService.t()('actions.actionTypes.lightOn');
    }
    if (lowerActionName.includes('light') && lowerActionName.includes('off')) {
      return this.languageService.t()('actions.actionTypes.lightOff');
    }
    if (lowerActionName.includes('pump') && lowerActionName.includes('on')) {
      return this.languageService.t()('actions.actionTypes.waterPumpOn');
    }
    if (lowerActionName.includes('pump') && lowerActionName.includes('off')) {
      return this.languageService.t()('actions.actionTypes.waterPumpOff');
    }
    
    // Fallback to original name if no translation found
    return actionName;
  }

  getDeviceDisplayName(deviceName: string): string {
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
    
    const translatedName = deviceMap[deviceName.toLowerCase()];
    return translatedName || deviceName;
  }

  getDeviceStatusTranslation(status: string): string {
    switch (status) {
      case 'online': return this.languageService.t()('devices.statusOnline');
      case 'offline': return this.languageService.t()('devices.statusOffline');
      case 'active': return this.languageService.t()('devices.statusActive');
      case 'inactive': return this.languageService.t()('devices.statusInactive');
      case 'error': return this.languageService.t()('devices.statusError');
      default: return status;
    }
  }
}
