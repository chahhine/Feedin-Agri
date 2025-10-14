import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDividerModule } from '@angular/material/divider';
import { MatFabModule } from '@angular/material/fab';

import { ApiService } from '../../core/services/api.service';
import { FarmManagementService } from '../../core/services/farm-management.service';
import { Device, DeviceStatus } from '../../core/models/farm.model';
import { LanguageService } from '../../core/services/language.service';
import { DeviceDetailsDialogComponent } from './components/device-details-dialog/device-details-dialog.component';
import { DeviceFormComponent } from './components/device-form/device-form.component';

@Component({
  selector: 'app-devices',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatSortModule,
    MatPaginatorModule,
    MatDividerModule,
    MatFabModule
  ],
  templateUrl: './devices.component.html',
  styleUrl: './devices.component.scss'
})
export class DevicesComponent implements OnInit {
  private apiService = inject(ApiService);
  private farmManagement = inject(FarmManagementService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  public languageService = inject(LanguageService);

  devices: Device[] = [];
  filteredDevices: Device[] = [];
  dataSource = new MatTableDataSource<Device>();
  isLoading = true;

  // Table configuration
  displayedColumns: string[] = ['select', 'name', 'status', 'location', 'device_type', 'last_seen', 'actions'];
  selectedDevices: Set<string> = new Set();

  // Filtering and search
  searchTerm = '';
  statusFilter = '';
  deviceTypeFilter = '';
  availableStatuses = Object.values(DeviceStatus);
  availableDeviceTypes = ['sensor', 'controller', 'gateway', 'camera', 'actuator', 'monitor'];

  // Pagination
  pageSize = 10;
  pageIndex = 0;
  totalDevices = 0;

  // View mode
  viewMode: 'table' | 'cards' = 'table';

  ngOnInit(): void {
    this.loadDevices();

    // Subscribe to farm selection changes
    this.farmManagement.selectedFarm$.subscribe(selectedFarm => {
      if (selectedFarm) {
        console.log('🏡 [DEVICES] Farm changed, reloading devices for:', selectedFarm.name);
        this.loadDevices();
      }
    });
  }

  private loadDevices(): void {
    this.isLoading = true;

    const selectedFarm = this.farmManagement.getSelectedFarm();
    if (!selectedFarm) {
      console.log('⚠️ [DEVICES] No farm selected, skipping devices load');
      this.isLoading = false;
      return;
    }

    console.log('🏡 [DEVICES] Loading devices for farm:', selectedFarm.name);

    this.apiService.getDevicesByFarm(selectedFarm.farm_id).subscribe({
      next: (devices) => {
        this.devices = devices;
        this.filteredDevices = [...devices];
        this.dataSource.data = devices;
        this.totalDevices = devices.length;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading devices:', error);
        this.isLoading = false;
        this.snackBar.open(this.languageService.t()('errors.networkError'), this.languageService.t()('common.close'), {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
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

  refreshDevices(): void {
    this.loadDevices();
  }

  // CRUD Operations
  addDevice(): void {
    const selectedFarm = this.farmManagement.getSelectedFarm();
    if (!selectedFarm) {
      this.snackBar.open(
        this.languageService.t()('devices.noFarmSelected'),
        this.languageService.t()('common.close'),
        { duration: 3000, panelClass: ['error-snackbar'] }
      );
      return;
    }

    const dialogRef = this.dialog.open(DeviceFormComponent, {
      width: '600px',
      maxHeight: '90vh',
      data: { farmId: selectedFarm.farm_id }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.action === 'created') {
        this.loadDevices();
      }
    });
  }

  editDevice(device: Device): void {
    const selectedFarm = this.farmManagement.getSelectedFarm();
    if (!selectedFarm) return;

    const dialogRef = this.dialog.open(DeviceFormComponent, {
      width: '600px',
      maxHeight: '90vh',
      data: { device, farmId: selectedFarm.farm_id }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.action === 'updated') {
        this.loadDevices();
      }
    });
  }

  deleteDevice(device: Device): void {
    if (confirm(this.languageService.t()('devices.confirmDelete', { name: device.name }))) {
      this.apiService.deleteDevice(device.device_id).subscribe({
        next: () => {
          this.snackBar.open(
            this.languageService.t()('devices.deviceDeleted'),
            this.languageService.t()('common.close'),
            { duration: 3000, panelClass: ['success-snackbar'] }
          );
          this.loadDevices();
        },
        error: (error) => {
          console.error('Error deleting device:', error);
          this.snackBar.open(
            this.languageService.t()('errors.deleteError'),
            this.languageService.t()('common.close'),
            { duration: 3000, panelClass: ['error-snackbar'] }
          );
        }
      });
    }
  }

  viewDeviceDetails(device: Device): void {
    const dialogRef = this.dialog.open(DeviceDetailsDialogComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: { device }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (result.action === 'edit') {
          this.editDevice(result.device);
        } else if (result.action === 'delete') {
          this.deleteDevice(result.device);
        }
      }
    });
  }

  // Selection methods
  toggleDeviceSelection(deviceId: string): void {
    if (this.selectedDevices.has(deviceId)) {
      this.selectedDevices.delete(deviceId);
    } else {
      this.selectedDevices.add(deviceId);
    }
  }

  isDeviceSelected(deviceId: string): boolean {
    return this.selectedDevices.has(deviceId);
  }

  toggleAllDevicesSelection(): void {
    if (this.selectedDevices.size === this.filteredDevices.length) {
      this.selectedDevices.clear();
    } else {
      this.filteredDevices.forEach(device => {
        this.selectedDevices.add(device.device_id);
      });
    }
  }

  isAllDevicesSelected(): boolean {
    return this.filteredDevices.length > 0 && this.selectedDevices.size === this.filteredDevices.length;
  }

  isSomeDevicesSelected(): boolean {
    return this.selectedDevices.size > 0 && this.selectedDevices.size < this.filteredDevices.length;
  }

  // Bulk operations
  deleteSelectedDevices(): void {
    if (this.selectedDevices.size === 0) return;

    const deviceNames = this.devices
      .filter(device => this.selectedDevices.has(device.device_id))
      .map(device => device.name)
      .join(', ');

    if (confirm(this.languageService.t()('devices.confirmBulkDelete', { count: this.selectedDevices.size, names: deviceNames }))) {
      const deletePromises = Array.from(this.selectedDevices).map(deviceId =>
        this.apiService.deleteDevice(deviceId).toPromise()
      );

      Promise.all(deletePromises).then(() => {
        this.snackBar.open(
          this.languageService.t()('devices.devicesDeleted', { count: this.selectedDevices.size }),
          this.languageService.t()('common.close'),
          { duration: 3000, panelClass: ['success-snackbar'] }
        );
        this.selectedDevices.clear();
        this.loadDevices();
      }).catch(error => {
        console.error('Error deleting devices:', error);
        this.snackBar.open(
          this.languageService.t()('errors.bulkDeleteError'),
          this.languageService.t()('common.close'),
          { duration: 3000, panelClass: ['error-snackbar'] }
        );
      });
    }
  }

  // Filtering and search
  applyFilters(): void {
    let filtered = [...this.devices];

    // Apply search filter
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(device =>
        device.name.toLowerCase().includes(searchLower) ||
        device.location.toLowerCase().includes(searchLower) ||
        (device.device_type && device.device_type.toLowerCase().includes(searchLower)) ||
        (device.description && device.description.toLowerCase().includes(searchLower))
      );
    }

    // Apply status filter
    if (this.statusFilter) {
      filtered = filtered.filter(device => device.status === this.statusFilter);
    }

    // Apply device type filter
    if (this.deviceTypeFilter) {
      filtered = filtered.filter(device => device.device_type === this.deviceTypeFilter);
    }

    this.filteredDevices = filtered;
    this.dataSource.data = filtered;
    this.totalDevices = filtered.length;
    this.pageIndex = 0; // Reset to first page when filtering
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onStatusFilterChange(): void {
    this.applyFilters();
  }

  onDeviceTypeFilterChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = '';
    this.deviceTypeFilter = '';
    this.applyFilters();
  }

  // Sorting
  onSortChange(sort: Sort): void {
    const data = this.filteredDevices.slice();
    if (!sort.active || sort.direction === '') {
      this.dataSource.data = data;
      return;
    }

    data.sort((a, b) => {
      const isAsc = sort.direction === 'asc';
      switch (sort.active) {
        case 'name':
          return this.compare(a.name, b.name, isAsc);
        case 'status':
          return this.compare(a.status, b.status, isAsc);
        case 'location':
          return this.compare(a.location, b.location, isAsc);
        case 'device_type':
          return this.compare(a.device_type || '', b.device_type || '', isAsc);
        case 'last_seen':
          return this.compare(new Date(a.last_seen || 0), new Date(b.last_seen || 0), isAsc);
        default:
          return 0;
      }
    });

    this.dataSource.data = data;
  }

  private compare(a: any, b: any, isAsc: boolean): number {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
  }

  // Pagination
  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
  }

  // View mode
  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'table' ? 'cards' : 'table';
  }

  // Translation helper methods
  getStatusTranslation(status: string): string {
    const statusKey = status.toLowerCase();
    const translationKey = `dashboard.deviceStatus.${statusKey}`;
    const translation = this.languageService.t()(translationKey);

    // If translation not found, return the original status
    return translation === translationKey ? status : translation;
  }

  getDeviceTypeTranslation(deviceType: string): string {
    if (!deviceType) {
      return this.languageService.t()('common.none');
    }

    const typeKey = deviceType.toLowerCase();
    const translationKey = `devices.deviceTypes.${typeKey}`;
    const translation = this.languageService.t()(translationKey);

    // If translation not found, return the original device type
    return translation === translationKey ? deviceType : translation;
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
      case 'actuator':
        return 'build';
      case 'monitor':
        return 'monitor';
      default:
        return 'devices';
    }
  }
}
