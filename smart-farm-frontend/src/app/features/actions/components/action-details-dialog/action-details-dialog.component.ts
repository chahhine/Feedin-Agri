import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';

import { ActionLog } from '../../../../core/models/action-log.model';
import { Device, Farm } from '../../../../core/models/farm.model';

interface DialogData {
  action: ActionLog;
  devices: Device[];
  farms: Farm[];
}

@Component({
  selector: 'app-action-details-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatExpansionModule,
  ],
  template: `
    <div class="action-details-dialog">
      <h2 mat-dialog-title>
        <mat-icon [ngClass]="getStatusClass()">{{ getStatusIcon() }}</mat-icon>
        Action Details
      </h2>
      
      <mat-dialog-content>
        <div class="action-overview">
          <mat-card class="overview-card">
            <mat-card-content>
              <div class="overview-grid">
                <div class="overview-item">
                  <mat-icon>schedule</mat-icon>
                  <div class="item-content">
                    <span class="label">Executed At</span>
                    <span class="value">{{ data.action.created_at | date:'medium' }}</span>
                  </div>
                </div>
                
                <div class="overview-item">
                  <mat-icon>{{ data.action.trigger_source === 'auto' ? 'settings' : 'touch_app' }}</mat-icon>
                  <div class="item-content">
                    <span class="label">Trigger Source</span>
                    <mat-chip [color]="data.action.trigger_source === 'auto' ? 'primary' : 'accent'" selected>
                      {{ data.action.trigger_source | titlecase }}
                    </mat-chip>
                  </div>
                </div>
                
                <div class="overview-item">
                  <mat-icon>{{ getStatusIcon() }}</mat-icon>
                  <div class="item-content">
                    <span class="label">Status</span>
                    <mat-chip [ngClass]="'status-' + data.action.status" selected>
                      {{ data.action.status | titlecase }}
                    </mat-chip>
                  </div>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <div class="action-details">
            <!-- Device Information -->
            <mat-expansion-panel>
              <mat-expansion-panel-header>
                <mat-panel-title>
                  <mat-icon>devices</mat-icon>
                  Device Information
                </mat-panel-title>
              </mat-expansion-panel-header>
              <div class="panel-content">
                <div class="detail-item">
                  <span class="label">Device ID:</span>
                  <span class="value">{{ data.action.device_id }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Device Name:</span>
                  <span class="value">{{ getDeviceName() }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Location:</span>
                  <span class="value">{{ getDeviceLocation() }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Farm:</span>
                  <span class="value">{{ getFarmName() }}</span>
                </div>
              </div>
            </mat-expansion-panel>

            <!-- Sensor Information -->
            <mat-expansion-panel *ngIf="data.action.sensor_id && data.action.sensor_id !== 'manual_trigger'">
              <mat-expansion-panel-header>
                <mat-panel-title>
                  <mat-icon>sensors</mat-icon>
                  Sensor Information
                </mat-panel-title>
              </mat-expansion-panel-header>
              <div class="panel-content">
                <div class="detail-item">
                  <span class="label">Sensor ID:</span>
                  <span class="value">{{ data.action.sensor_id }}</span>
                </div>
                <div class="detail-item" *ngIf="data.action.sensor_type">
                  <span class="label">Sensor Type:</span>
                  <span class="value">{{ data.action.sensor_type }}</span>
                </div>
                <div class="detail-item" *ngIf="data.action.value">
                  <span class="label">Trigger Value:</span>
                  <span class="value">{{ data.action.value }}{{ data.action.unit }}</span>
                </div>
                <div class="detail-item" *ngIf="data.action.violation_type">
                  <span class="label">Violation Type:</span>
                  <span class="value">{{ data.action.violation_type }}</span>
                </div>
              </div>
            </mat-expansion-panel>

            <!-- Action Information -->
            <mat-expansion-panel>
              <mat-expansion-panel-header>
                <mat-panel-title>
                  <mat-icon>settings</mat-icon>
                  Action Information
                </mat-panel-title>
              </mat-expansion-panel-header>
              <div class="panel-content">
                <div class="detail-item">
                  <span class="label">Action URI:</span>
                  <span class="value code">{{ data.action.action_uri }}</span>
                </div>
                <div class="detail-item" *ngIf="data.action.topic">
                  <span class="label">MQTT Topic:</span>
                  <span class="value code">{{ data.action.topic }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Action Name:</span>
                  <span class="value">{{ getActionName() }}</span>
                </div>
                <div class="detail-item" *ngIf="data.action.error_message">
                  <span class="label">Error Message:</span>
                  <span class="value error">{{ data.action.error_message }}</span>
                </div>
              </div>
            </mat-expansion-panel>

            <!-- Payload Information -->
            <mat-expansion-panel *ngIf="data.action.payload">
              <mat-expansion-panel-header>
                <mat-panel-title>
                  <mat-icon>code</mat-icon>
                  Payload Data
                </mat-panel-title>
              </mat-expansion-panel-header>
              <div class="panel-content">
                <pre class="payload-json">{{ formatPayload() }}</pre>
              </div>
            </mat-expansion-panel>

            <!-- Timeline -->
            <mat-expansion-panel>
              <mat-expansion-panel-header>
                <mat-panel-title>
                  <mat-icon>timeline</mat-icon>
                  Timeline
                </mat-panel-title>
              </mat-expansion-panel-header>
              <div class="panel-content">
                <div class="timeline">
                  <div class="timeline-item">
                    <div class="timeline-marker queued"></div>
                    <div class="timeline-content">
                      <span class="timeline-label">Queued</span>
                      <span class="timeline-time">{{ data.action.created_at | date:'medium' }}</span>
                    </div>
                  </div>
                  
                  <div class="timeline-item" *ngIf="data.action.status !== 'queued'">
                    <div class="timeline-marker sent"></div>
                    <div class="timeline-content">
                      <span class="timeline-label">Sent</span>
                      <span class="timeline-time">{{ data.action.updated_at | date:'medium' }}</span>
                    </div>
                  </div>
                  
                  <div class="timeline-item" *ngIf="data.action.status === 'ack'">
                    <div class="timeline-marker ack"></div>
                    <div class="timeline-content">
                      <span class="timeline-label">Acknowledged</span>
                      <span class="timeline-time">{{ data.action.updated_at | date:'medium' }}</span>
                    </div>
                  </div>
                  
                  <div class="timeline-item" *ngIf="data.action.status === 'error'">
                    <div class="timeline-marker error"></div>
                    <div class="timeline-content">
                      <span class="timeline-label">Error</span>
                      <span class="timeline-time">{{ data.action.updated_at | date:'medium' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </mat-expansion-panel>
          
        </div>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end">
        <button mat-button (click)="onClose()">
          Close
        </button>
        <button mat-raised-button color="primary" (click)="onClose()">
          <mat-icon>check</mat-icon>
          OK
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .action-details-dialog {
      min-width: 600px;
      max-width: 800px;
    }
    
    .action-details-dialog h2 {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }
    
    .action-overview {
      margin-bottom: 24px;
    }
    
    .overview-card {
      border-radius: 12px;
    }
    
    .overview-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
    }
    
    .overview-item {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .overview-item mat-icon {
      color: #666;
      font-size: 24px;
      width: 24px;
    }
    
    .item-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .item-content .label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      font-weight: 500;
    }
    
    .item-content .value {
      font-size: 14px;
      color: #333;
      font-weight: 500;
    }
    
    .action-details {
      margin-bottom: 24px;
    }
    
    .panel-content {
      padding: 16px 0;
    }
    
    .detail-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    
    .detail-item:last-child {
      border-bottom: none;
    }
    
    .detail-item .label {
      font-weight: 500;
      color: #666;
      min-width: 120px;
    }
    
    .detail-item .value {
      color: #333;
      text-align: right;
      flex: 1;
    }
    
    .detail-item .value.code {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      background-color: #f5f5f5;
      padding: 4px 8px;
      border-radius: 4px;
      word-break: break-all;
    }
    
    .detail-item .value.error {
      color: #d32f2f;
      font-style: italic;
    }
    
    .payload-json {
      background-color: #f5f5f5;
      padding: 16px;
      border-radius: 8px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-word;
    }
    
    .timeline {
      position: relative;
      padding-left: 24px;
    }
    
    .timeline::before {
      content: '';
      position: absolute;
      left: 8px;
      top: 0;
      bottom: 0;
      width: 2px;
      background-color: #e0e0e0;
    }
    
    .timeline-item {
      position: relative;
      margin-bottom: 20px;
    }
    
    .timeline-marker {
      position: absolute;
      left: -20px;
      top: 4px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 2px solid #fff;
      box-shadow: 0 0 0 2px #e0e0e0;
    }
    
    .timeline-marker.queued { background-color: #2196f3; }
    .timeline-marker.sent { background-color: #4caf50; }
    .timeline-marker.ack { background-color: #00bcd4; }
    .timeline-marker.error { background-color: #f44336; }
    
    .timeline-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .timeline-label {
      font-weight: 500;
      color: #333;
    }
    
    .timeline-time {
      font-size: 12px;
      color: #666;
    }
    
    .status-queued { background-color: #e8f5e9; color: #2e7d32; }
    .status-sent { background-color: #e8f5e9; color: #388e3c; }
    .status-ack { background-color: #e0f7fa; color: #0097a7; }
    .status-error { background-color: #ffebee; color: #d32f2f; }
    
    .mat-dialog-actions {
      padding: 20px 0 0 0;
      margin: 0;
    }
    
    .mat-dialog-actions button {
      margin-left: 8px;
    }
  `]
})
export class ActionDetailsDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ActionDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  onClose(): void {
    this.dialogRef.close();
  }

  getStatusIcon(): string {
    const icons: { [key: string]: string } = {
      queued: 'schedule',
      sent: 'send',
      ack: 'check_circle',
      error: 'error'
    };
    return icons[this.data.action.status] || 'help_outline';
  }

  getStatusClass(): string {
    return `status-${this.data.action.status}`;
  }

  getDeviceName(): string {
    const device = this.data.devices.find(d => d.device_id === this.data.action.device_id);
    return device ? device.name : this.data.action.device_id;
  }

  getDeviceLocation(): string {
    const device = this.data.devices.find(d => d.device_id === this.data.action.device_id);
    return device ? device.location : 'Unknown';
  }

  getFarmName(): string {
    const device = this.data.devices.find(d => d.device_id === this.data.action.device_id);
    if (!device) return 'Unknown';
    
    const farm = this.data.farms.find(f => f.farm_id === device.farm_id);
    return farm ? farm.name : 'Unknown';
  }

  getActionName(): string {
    const parts = this.data.action.action_uri.split('/');
    return parts[parts.length - 1].replace(/_/g, ' ').replace(/mqtt:/, '');
  }

  formatPayload(): string {
    if (!this.data.action.payload) return '';
    return JSON.stringify(this.data.action.payload, null, 2);
  }
}
