import { Component, Inject, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';

import { Device, Sensor, SensorReading } from '../../../../core/models/farm.model';
import { ApiService } from '../../../../core/services/api.service';
import { LanguageService } from '../../../../core/services/language.service';

export interface DeviceDetailsDialogData {
  device: Device;
}

@Component({
  selector: 'app-device-details-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatListModule,
    MatTooltipModule
  ],
  templateUrl: './device-details-dialog.component.html',
  styleUrl: './device-details-dialog.component.scss'
})
export class DeviceDetailsDialogComponent implements OnInit {
  private apiService = inject(ApiService);
  private snackBar = inject(MatSnackBar);
  public languageService = inject(LanguageService);

  device: Device;
  sensors: Sensor[] = [];
  isLoadingSensors = false;
  deviceStatistics: any = null;
  isLoadingStats = false;

  constructor(
    public dialogRef: MatDialogRef<DeviceDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DeviceDetailsDialogData
  ) {
    this.device = data.device;
  }

  ngOnInit(): void {
    this.loadDeviceSensors();
    this.loadDeviceStatistics();
  }

  private loadDeviceSensors(): void {
    this.isLoadingSensors = true;
    this.apiService.getSensorsByDevice(this.device.device_id).subscribe({
      next: (sensors) => {
        this.sensors = sensors;
        this.isLoadingSensors = false;
      },
      error: (error) => {
        console.error('Error loading device sensors:', error);
        this.isLoadingSensors = false;
        this.snackBar.open(
          this.languageService.t()('errors.networkError'),
          this.languageService.t()('common.close'),
          { duration: 3000, panelClass: ['error-snackbar'] }
        );
      }
    });
  }

  private loadDeviceStatistics(): void {
    this.isLoadingStats = true;
    this.apiService.getDeviceStatistics().subscribe({
      next: (stats) => {
        this.deviceStatistics = stats;
        this.isLoadingStats = false;
      },
      error: (error) => {
        console.error('Error loading device statistics:', error);
        this.isLoadingStats = false;
      }
    });
  }

  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'online':
        return 'primary';
      case 'offline':
        return 'warn';
      case 'maintenance':
        return 'accent';
      default:
        return 'basic';
    }
  }

  getStatusIcon(status: string): string {
    switch (status.toLowerCase()) {
      case 'online':
        return 'wifi';
      case 'offline':
        return 'wifi_off';
      case 'maintenance':
        return 'build';
      default:
        return 'help';
    }
  }

  getDeviceTypeIcon(deviceType: string): string {
    if (!deviceType) return 'devices';

    switch (deviceType.toLowerCase()) {
      case 'sensor':
        return 'sensors';
      case 'controller':
        return 'settings';
      case 'gateway':
        return 'router';
      case 'camera':
        return 'videocam';
      default:
        return 'devices';
    }
  }

  onClose(): void {
    this.dialogRef.close();
  }

  onEdit(): void {
    this.dialogRef.close({ action: 'edit', device: this.device });
  }

  onDelete(): void {
    this.dialogRef.close({ action: 'delete', device: this.device });
  }

  onRestart(): void {
    // TODO: Implement device restart functionality
    this.snackBar.open(
      this.languageService.t()('devices.restartInitiated'),
      this.languageService.t()('common.close'),
      { duration: 3000 }
    );
  }

  onUpdateFirmware(): void {
    // TODO: Implement firmware update functionality
    this.snackBar.open(
      this.languageService.t()('devices.firmwareUpdateInitiated'),
      this.languageService.t()('common.close'),
      { duration: 3000 }
    );
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return this.languageService.t()('common.none');
    return new Date(date).toLocaleString();
  }

  getSensorTypeIcon(sensorType: string): string {
    switch (sensorType.toLowerCase()) {
      case 'temperature':
        return 'thermostat';
      case 'humidity':
        return 'water_drop';
      case 'soil_moisture':
        return 'water';
      case 'light':
        return 'light_mode';
      case 'ph':
        return 'science';
      default:
        return 'sensors';
    }
  }

  getSensorStatusColor(sensor: Sensor): string {
    // This would be based on sensor readings and thresholds
    return 'primary';
  }
}

