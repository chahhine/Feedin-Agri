import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { debounceTime, Subject } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

import { ApiService } from '../../core/services/api.service';
import { FarmManagementService } from '../../core/services/farm-management.service';
import { Device, DeviceStatus } from '../../core/models/farm.model';
import { LanguageService } from '../../core/services/language.service';
import * as DeviceUtils from './device.utils';

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
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSortModule,
    MatPaginatorModule
  ],
  templateUrl: './devices.component.html',
  styleUrl: './devices.component.scss'
})
export class DevicesComponent implements OnInit {
  private apiService = inject(ApiService);
  private farmManagement = inject(FarmManagementService);
  private snackBar = inject(MatSnackBar);
  public languageService = inject(LanguageService);

  devices: Device[] = [];
  filteredDevices: Device[] = [];
  dataSource = new MatTableDataSource<Device>();
  isLoading = true;

  // Table configuration (read-only)
  displayedColumns: string[] = ['name', 'status', 'location', 'device_type', 'last_seen'];

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

  // Helper getters for pagination
  get startIndex(): number {
    return this.pageIndex * this.pageSize;
  }

  get endIndex(): number {
    return this.startIndex + this.pageSize;
  }

  get hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.statusFilter || this.deviceTypeFilter);
  }

  get activeFilterCount(): number {
    return (this.searchTerm ? 1 : 0) + (this.statusFilter ? 1 : 0) + (this.deviceTypeFilter ? 1 : 0);
  }

  // View mode
  viewMode: 'table' | 'cards' = 'table';

  // Search debounce
  private searchSubject = new Subject<string>();
  private destroyRef = inject(DestroyRef);

  constructor() {
    // Setup search debounce
    this.searchSubject.pipe(
      debounceTime(300),
      takeUntilDestroyed()
    ).subscribe(() => {
      this.applyFilters();
    });
  }

  ngOnInit(): void {
    this.loadDevices();

    // Subscribe to farm selection changes with proper cleanup
    this.farmManagement.selectedFarm$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(selectedFarm => {
      if (selectedFarm) {
        this.loadDevices();
      }
    });
  }

  private loadDevices(): void {
    this.isLoading = true;

    const selectedFarm = this.farmManagement.getSelectedFarm();
    if (!selectedFarm) {
      this.isLoading = false;
      return;
    }

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
        this.isLoading = false;
        this.snackBar.open(this.languageService.t()('errors.networkError'), this.languageService.t()('common.close'), {
          duration: 3000, panelClass: ['error-snackbar']
        });
      }
    });
  }

  getStatusColor(status: string): string {
    return DeviceUtils.getStatusColor(status);
  }

  getStatusIcon(status: string): string {
    return DeviceUtils.getStatusIcon(status);
  }

  getDeviceTypeIcon(deviceType: string): string {
    return DeviceUtils.getDeviceTypeIcon(deviceType);
  }

  getDeviceTypeGradient(deviceType: string): string {
    return DeviceUtils.getDeviceTypeGradient(deviceType);
  }

  getStatusTranslation(status: string): string {
    return DeviceUtils.getStatusTranslation(status, this.languageService.t());
  }

  getDeviceTypeTranslation(deviceType: string): string {
    return DeviceUtils.getDeviceTypeTranslation(deviceType, this.languageService.t());
  }

  refreshDevices(): void {
    this.loadDevices();
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
    this.searchSubject.next(this.searchTerm);
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

}
