import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';

import { Device, Farm } from '../../../../../core/models/farm.model';

interface ActionTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  actionUri: string;
  category: string;
  requiresConfirmation: boolean;
  estimatedDuration?: string;
  actionType: 'critical' | 'important' | 'normal';
  qosLevel: 0 | 1 | 2;
  retainFlag: boolean;
  maxRetries: number;
}

interface DialogData {
  device: Device;
  action: ActionTemplate;
  farm: Farm;
}

@Component({
  selector: 'app-action-confirmation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
  ],
  template: `
    <div class="confirmation-dialog">
      <h2 mat-dialog-title>
        <mat-icon [ngClass]="getActionCategoryClass()">{{ data.action.icon }}</mat-icon>
        Confirm Action
      </h2>
      
      <mat-dialog-content>
        <div class="action-details">
          <mat-card class="action-card">
            <mat-card-header>
              <mat-card-title>{{ data.action.name }}</mat-card-title>
              <mat-card-subtitle>{{ data.action.description }}</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <div class="action-info">
                <div class="info-row">
                  <mat-icon>devices</mat-icon>
                  <span><strong>Device:</strong> {{ data.device.name }}</span>
                </div>
                <div class="info-row">
                  <mat-icon>location_on</mat-icon>
                  <span><strong>Location:</strong> {{ data.device.location }}</span>
                </div>
                <div class="info-row" *ngIf="data.farm">
                  <mat-icon>home</mat-icon>
                  <span><strong>Farm:</strong> {{ data.farm.name }}</span>
                </div>
                <div class="info-row">
                  <mat-icon>category</mat-icon>
                  <span><strong>Category:</strong> 
                    <mat-chip [color]="getCategoryColor()" selected>
                      {{ data.action.category | titlecase }}
                    </mat-chip>
                  </span>
                </div>
                <div class="info-row" *ngIf="data.action.estimatedDuration">
                  <mat-icon>schedule</mat-icon>
                  <span><strong>Estimated Duration:</strong> {{ data.action.estimatedDuration }}</span>
                </div>
                <div class="info-row">
                  <mat-icon>priority_high</mat-icon>
                  <span><strong>Action Type:</strong> 
                    <mat-chip [color]="getActionTypeColor()" selected>
                      {{ data.action.actionType | titlecase }}
                    </mat-chip>
                  </span>
                </div>
                <div class="info-row">
                  <mat-icon>network_check</mat-icon>
                  <span><strong>QoS Level:</strong> {{ data.action.qosLevel }} ({{ getQosDescription() }})</span>
                </div>
                <div class="info-row">
                  <mat-icon>repeat</mat-icon>
                  <span><strong>Max Retries:</strong> {{ data.action.maxRetries }}</span>
                </div>
                <div class="info-row" *ngIf="data.action.retainFlag">
                  <mat-icon>save</mat-icon>
                  <span><strong>Retain Flag:</strong> Enabled (message will be retained for new subscribers)</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <div class="warning-section" *ngIf="isHighImpactAction()">
            <mat-card class="warning-card">
              <mat-card-content>
                <div class="warning-content">
                  <mat-icon class="warning-icon">warning</mat-icon>
                  <div class="warning-text">
                    <h4>High Impact Action</h4>
                    <p>This action may significantly affect your farm operations. Please ensure this is the intended action.</p>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          </div>

          <div class="action-preview">
            <h4>Action Details:</h4>
            <div class="preview-content">
              <div class="preview-item">
                <strong>Action URI:</strong> 
                <code>{{ data.action.actionUri }}</code>
              </div>
              <div class="preview-item">
                <strong>Device ID:</strong> 
                <code>{{ data.device.device_id }}</code>
              </div>
            </div>
          </div>
        </div>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">
          <mat-icon>cancel</mat-icon>
          Cancel
        </button>
        <button mat-raised-button color="primary" (click)="onConfirm()">
          <mat-icon>check</mat-icon>
          Execute Action
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .confirmation-dialog {
      min-width: 500px;
    }
    
    .confirmation-dialog h2 {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }
    
    .action-details {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    
    .action-card {
      margin-bottom: 16px;
    }
    
    .action-info {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .info-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .info-row mat-icon {
      color: #666;
      font-size: 20px;
      width: 20px;
    }
    
    .warning-section {
      margin: 16px 0;
    }
    
    .warning-card {
      border-left: 4px solid #ff9800;
      background-color: #fff3e0;
    }
    
    .warning-content {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    
    .warning-icon {
      color: #ff9800;
      font-size: 24px;
      width: 24px;
      margin-top: 4px;
    }
    
    .warning-text h4 {
      margin: 0 0 8px 0;
      color: #e65100;
    }
    
    .warning-text p {
      margin: 0;
      color: #bf360c;
    }
    
    .action-preview {
      background-color: #f5f5f5;
      padding: 16px;
      border-radius: 8px;
      border: 1px solid #e0e0e0;
    }
    
    .action-preview h4 {
      margin: 0 0 12px 0;
      color: #333;
    }
    
    .preview-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .preview-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .preview-item code {
      background-color: #e8e8e8;
      padding: 4px 8px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      word-break: break-all;
    }
    
    .mat-dialog-actions {
      padding: 20px 0 0 0;
      margin: 0;
    }
    
    .mat-dialog-actions button {
      margin-left: 8px;
    }
    
    .category-irrigation { color: #2196f3; }
    .category-ventilation { color: #4caf50; }
    .category-heating { color: #ff5722; }
    .category-lighting { color: #ffc107; }
    .category-security { color: #f44336; }
    .category-maintenance { color: #9c27b0; }
  `]
})
export class ActionConfirmationDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ActionConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  getActionCategoryClass(): string {
    return `category-${this.data.action.category}`;
  }

  getCategoryColor(): 'primary' | 'accent' | 'warn' {
    const colors: { [key: string]: 'primary' | 'accent' | 'warn' } = {
      irrigation: 'primary',
      ventilation: 'accent',
      heating: 'warn',
      lighting: 'primary',
      security: 'warn',
      maintenance: 'accent'
    };
    return colors[this.data.action.category] || 'primary';
  }

  isHighImpactAction(): boolean {
    const highImpactActions = [
      'irrigation_on',
      'heater_on',
      'open_roof',
      'close_roof',
      'restart_device',
      'alarm_on'
    ];
    return highImpactActions.includes(this.data.action.id);
  }

  getActionTypeColor(): 'primary' | 'accent' | 'warn' {
    const colors: { [key: string]: 'primary' | 'accent' | 'warn' } = {
      critical: 'warn',
      important: 'accent',
      normal: 'primary'
    };
    return colors[this.data.action.actionType] || 'primary';
  }

  getQosDescription(): string {
    const descriptions: { [key: number]: string } = {
      0: 'At most once (fire and forget)',
      1: 'At least once (acknowledged)',
      2: 'Exactly once (assured)'
    };
    return descriptions[this.data.action.qosLevel] || 'Unknown';
  }
}
