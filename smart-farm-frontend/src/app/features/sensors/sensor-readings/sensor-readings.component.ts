import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  effect,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval, combineLatest, EMPTY } from 'rxjs';
import { startWith, switchMap, catchError } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';

// Services
import { ApiService } from '../../../core/services/api.service';
import { FarmManagementService } from '../../../core/services/farm-management.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LanguageService } from '../../../core/services/language.service';
import { ReadingsMapService } from './services/readings-map.service';

// Models
import { Farm, Device, Sensor, SensorReading } from '../../../core/models/farm.model';

// Utils
import {
  calculateSensorStatus,
  SensorWithThresholds,
  SensorStatusResult,
} from './utils/sensor-status.util';
import { normalizeThresholds } from './utils/sensor-thresholds.util';

// Child Components
import { GlobalFilterHeaderComponent, FilterState } from './components/global-filter-header/global-filter-header.component';
import { DeviceListPanelComponent, DeviceListItem } from './components/device-list-panel/device-list-panel.component';
import { DeviceDetailPanelComponent, DeviceDetail } from './components/device-detail-panel/device-detail-panel.component';
import { FooterSummaryComponent, SummaryCounts } from './components/footer-summary/footer-summary.component';

@Component({
  selector: 'app-sensor-readings',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    GlobalFilterHeaderComponent,
    DeviceListPanelComponent,
    DeviceDetailPanelComponent,
    FooterSummaryComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sensor-readings-layout">
      <!-- Header -->
      <app-global-filter-header
        [title]="languageService.t()('sensorReadings.title')"
        [subtitle]="languageService.t()('sensorReadings.liveData')"
        [farms]="farms()"
        [filters]="filterState()"
        [loading]="loading()"
        [autoRefresh]="autoRefreshEnabled()"
        [density]="density()"
        (filterChange)="onFilterChange($event)"
        (refresh)="refreshData()"
        (autoRefreshToggle)="toggleAutoRefresh($event)"
        (densityToggle)="toggleDensity($event)"
      />

      <!-- KPI Dashboard Header -->
      <div class="kpi-dashboard" [class.compact]="density() === 'compact'">
        <div class="kpi-card-mini" [class.status-critical]="summaryCounts().critical > 0">
          <div class="kpi-icon-mini critical">
            <mat-icon>error</mat-icon>
          </div>
          <div class="kpi-content-mini">
            <span class="kpi-value-mini">{{ summaryCounts().critical }}</span>
            <span class="kpi-label-mini">Critical</span>
          </div>
        </div>

        <div class="kpi-card-mini" [class.status-warning]="summaryCounts().warning > 0">
          <div class="kpi-icon-mini warning">
            <mat-icon>warning</mat-icon>
          </div>
          <div class="kpi-content-mini">
            <span class="kpi-value-mini">{{ summaryCounts().warning }}</span>
            <span class="kpi-label-mini">Warning</span>
          </div>
        </div>

        <div class="kpi-card-mini" [class.status-normal]="summaryCounts().normal > 0">
          <div class="kpi-icon-mini normal">
            <mat-icon>check_circle</mat-icon>
          </div>
          <div class="kpi-content-mini">
            <span class="kpi-value-mini">{{ summaryCounts().normal }}</span>
            <span class="kpi-label-mini">Normal</span>
          </div>
        </div>

        <div class="kpi-card-mini" [class.status-offline]="summaryCounts().offline > 0">
          <div class="kpi-icon-mini offline">
            <mat-icon>sensors_off</mat-icon>
          </div>
          <div class="kpi-content-mini">
            <span class="kpi-value-mini">{{ summaryCounts().offline }}</span>
            <span class="kpi-label-mini">Offline</span>
          </div>
        </div>

        <div class="kpi-card-mini highlight">
          <div class="kpi-icon-mini info">
            <mat-icon>sensors</mat-icon>
          </div>
          <div class="kpi-content-mini">
            <span class="kpi-value-mini">{{ deviceListItems().length }}</span>
            <span class="kpi-label-mini">Total Sensors</span>
          </div>
        </div>

        <div class="kpi-card-mini">
          <div class="kpi-icon-mini success">
            <mat-icon>speed</mat-icon>
          </div>
          <div class="kpi-content-mini">
            <span class="kpi-value-mini">{{ getOnlinePercentage() }}%</span>
            <span class="kpi-label-mini">Online Rate</span>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="main-content" [class.compact]="density() === 'compact'">
        <!-- Left Panel: Device List -->
        <app-device-list-panel
          [items]="deviceListItems()"
          [selectedId]="selectedSensorId()"
          [loading]="loading()"
          [density]="density()"
          (itemClick)="selectSensor($event)"
          (pinToggle)="togglePin($event)"
        />

        <!-- Right Panel: Device Detail -->
        <app-device-detail-panel
          [device]="selectedDeviceDetail()"
          [loading]="loading()"
        />
      </div>

      <!-- Footer Summary -->
      <app-footer-summary
        [counts]="summaryCounts()"
        [overallStatus]="overallStatus()"
        [overallTitle]="overallTitle()"
        [subtitle]="summarySubtitle()"
      />
    </div>
  `,
  styles: [
    `
      .sensor-readings-layout {
        min-height: 100vh;
        background: linear-gradient(135deg, #f8fafb 0%, #f0fdf4 100%);
        padding: 0;
        display: flex;
        flex-direction: column;
        position: relative;
        overflow-x: hidden;
      }

      /* KPI Dashboard Header */
      .kpi-dashboard {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 1rem;
        padding: 1.5rem 2rem;
        max-width: 1600px;
        width: 100%;
        margin: 0 auto;
        animation: fadeInDown 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      }

      @keyframes fadeInDown {
        from {
          opacity: 0;
          transform: translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .kpi-dashboard.compact {
        gap: 0.75rem;
        padding: 1rem 1.5rem;
      }

      .kpi-card-mini {
        position: relative;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 1rem 1.25rem;
        background: var(--glass-bg, rgba(255, 255, 255, 0.7));
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-radius: 16px;
        border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.4));
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06),
                    inset 0 1px 1px rgba(255, 255, 255, 0.6);
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        overflow: hidden;
      }

      .kpi-card-mini::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.3), transparent);
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      .kpi-card-mini:hover {
        transform: translateY(-4px) scale(1.02);
        box-shadow: 0 12px 32px rgba(16, 185, 129, 0.15),
                    inset 0 1px 1px rgba(255, 255, 255, 0.7);
        border-color: rgba(16, 185, 129, 0.3);
      }

      .kpi-card-mini:hover::before {
        opacity: 1;
      }

      .kpi-card-mini.highlight {
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1));
        border-color: rgba(16, 185, 129, 0.4);
      }

      .kpi-card-mini.status-critical {
        animation: pulseGlow 2s ease-in-out infinite;
      }

      @keyframes pulseGlow {
        0%, 100% {
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2),
                      inset 0 1px 1px rgba(255, 255, 255, 0.6);
        }
        50% {
          box-shadow: 0 4px 24px rgba(239, 68, 68, 0.4),
                      inset 0 1px 1px rgba(255, 255, 255, 0.6);
        }
      }

      .kpi-icon-mini {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .kpi-card-mini:hover .kpi-icon-mini {
        transform: scale(1.1) rotate(5deg);
      }

      .kpi-icon-mini.critical {
        background: linear-gradient(135deg, #fee2e2, #fecaca);
        color: #991b1b;
      }

      .kpi-icon-mini.warning {
        background: linear-gradient(135deg, #fef3c7, #fde68a);
        color: #92400e;
      }

      .kpi-icon-mini.normal {
        background: linear-gradient(135deg, #d1fae5, #a7f3d0);
        color: #065f46;
      }

      .kpi-icon-mini.offline {
        background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
        color: #4b5563;
      }

      .kpi-icon-mini.info {
        background: linear-gradient(135deg, #dbeafe, #bfdbfe);
        color: #1e40af;
      }

      .kpi-icon-mini.success {
        background: linear-gradient(135deg, #d1fae5, #34d399);
        color: #065f46;
      }

      .kpi-icon-mini mat-icon {
        font-size: 22px;
        width: 22px;
        height: 22px;
      }

      .kpi-content-mini {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex: 1;
        min-width: 0;
      }

      .kpi-value-mini {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--text-primary, #1f2937);
        line-height: 1;
        font-variant-numeric: tabular-nums;
      }

      .kpi-label-mini {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--text-secondary, #6b7280);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        opacity: 0.9;
      }

      /* Main Content Grid */
      .main-content {
        flex: 1;
        display: grid;
        grid-template-columns: minmax(460px, 520px) minmax(0, 1fr);
        gap: 1.5rem;
        padding: 0 2rem 2rem 2rem;
        max-width: 1600px;
        width: 100%;
        margin: 0 auto;
      }

      .main-content.compact {
        grid-template-columns: minmax(420px, 480px) minmax(0, 1fr);
        gap: 1.25rem;
      }

      /* Responsive Breakpoints */
      @media (max-width: 1439px) {
        .main-content {
          grid-template-columns: minmax(420px, 480px) minmax(0, 1fr);
        }
        .kpi-dashboard {
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        }
      }

      @media (max-width: 1279px) {
        .main-content {
          grid-template-columns: minmax(380px, 440px) minmax(0, 1fr);
        }
      }

      @media (max-width: 1023px) {
        .main-content {
          grid-template-columns: 300px minmax(0, 1fr);
          gap: 1rem;
          padding: 0 1.5rem 1.5rem 1.5rem;
        }
        .kpi-dashboard {
          padding: 1rem 1.5rem;
          grid-template-columns: repeat(3, 1fr);
        }
      }

      @media (max-width: 768px) {
        .main-content {
          grid-template-columns: 1fr;
          padding: 0 1rem 1rem 1rem;
        }
        .kpi-dashboard {
          padding: 1rem;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
        }
        .kpi-card-mini {
          padding: 0.875rem 1rem;
          gap: 10px;
        }
        .kpi-icon-mini {
          width: 36px;
          height: 36px;
        }
        .kpi-icon-mini mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
        .kpi-value-mini {
          font-size: 1.25rem;
        }
        .kpi-label-mini {
          font-size: 0.7rem;
        }
      }

      @media (max-width: 480px) {
        .kpi-dashboard {
          grid-template-columns: 1fr;
        }
      }

      /* Dark theme support */
      :host-context(body.dark-theme) .sensor-readings-layout {
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      }

      :host-context(body.dark-theme) .kpi-card-mini {
        background: var(--glass-bg, rgba(30, 41, 59, 0.7));
        border-color: var(--glass-border, rgba(100, 116, 139, 0.3));
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3),
                    inset 0 1px 1px rgba(100, 116, 139, 0.1);
      }

      :host-context(body.dark-theme) .kpi-card-mini:hover {
        box-shadow: 0 12px 32px rgba(16, 185, 129, 0.2),
                    inset 0 1px 1px rgba(100, 116, 139, 0.2);
      }

      :host-context(body.dark-theme) .kpi-card-mini.highlight {
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.15));
      }

      :host-context(body.dark-theme) .kpi-value-mini {
        color: var(--text-primary, #f1f5f9);
      }

      :host-context(body.dark-theme) .kpi-label-mini {
        color: var(--text-secondary, #cbd5e1);
      }

      /* Smooth scrollbar */
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }

      ::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.05);
        border-radius: 4px;
      }

      ::-webkit-scrollbar-thumb {
        background: rgba(16, 185, 129, 0.3);
        border-radius: 4px;
        transition: background 0.2s;
      }

      ::-webkit-scrollbar-thumb:hover {
        background: rgba(16, 185, 129, 0.5);
      }

      :host-context(body.dark-theme) ::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.05);
      }

      :host-context(body.dark-theme) ::-webkit-scrollbar-thumb {
        background: rgba(16, 185, 129, 0.4);
      }
    `,
  ],
})
export class SensorReadingsComponent implements OnInit {
  // Injected services
  private apiService = inject(ApiService);
  private farmManagement = inject(FarmManagementService);
  private notifications = inject(NotificationService);
  public languageService = inject(LanguageService);
  private readingsMap = inject(ReadingsMapService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  // State signals
  loading = signal(false);
  farms = signal<Farm[]>([]);
  devices = signal<Device[]>([]);
  sensors = signal<SensorWithThresholds[]>([]);
  sensorReadings = signal<SensorReading[]>([]);

  filterState = signal<FilterState>({
    farmId: '',
    sensorType: 'all',
    timeRange: '1h',
    searchQuery: '',
  });

  selectedSensorId = signal<string | null>(null);
  pinnedSensorIds = signal<Set<string>>(new Set());
  autoRefreshEnabled = signal(true);
  density = signal<'comfortable' | 'compact'>('comfortable');

  // Computed: Sensor statuses
  sensorStatuses = computed(() => {
    const sensorsData = this.sensors();
    const readings = this.sensorReadings();

    return sensorsData.map((sensor) =>
      calculateSensorStatus(sensor, readings, {
        offline: this.languageService.t()('sensorReadings.noRecentData'),
        optimal: this.languageService.t()('sensorReadings.optimalRange'),
        belowMin: this.languageService.t()('sensorReadings.belowMinimum'),
        aboveMax: this.languageService.t()('sensorReadings.aboveMaximum'),
        belowOptimal: this.languageService.t()('sensorReadings.belowOptimal'),
        aboveOptimal: this.languageService.t()('sensorReadings.aboveOptimal'),
      })
    );
  });

  // Computed: Filtered & sorted device list items
  deviceListItems = computed(() => {
    const statuses = this.sensorStatuses();
    const filters = this.filterState();
    const pinned = this.pinnedSensorIds();
    const devicesData = this.devices();
    const sensorsData = this.sensors();

    let filtered = statuses.map((statusResult, idx) => {
      const sensor = sensorsData[idx];
      const device = devicesData.find((d) => d.device_id === sensor.device_id);

      return {
        statusResult,
        sensor,
        device,
      };
    });

    // Apply farm filter
    if (filters.farmId) {
      filtered = filtered.filter((item) => item.device?.farm_id === filters.farmId);
    }

    // Apply type filter
    if (filters.sensorType !== 'all') {
      filtered = filtered.filter(
        (item) => item.sensor.type?.toLowerCase() === filters.sensorType
      );
    }

    // Apply search filter
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.sensor.sensor_id?.toLowerCase().includes(query) ||
          item.sensor.type?.toLowerCase().includes(query) ||
          item.device?.name?.toLowerCase().includes(query)
      );
    }

    // Map to DeviceListItem
    const items: DeviceListItem[] = filtered.map((item) => ({
      id: item.sensor.sensor_id,
      name: item.sensor.sensor_id || 'Unknown',
      type: item.sensor.type || 'Unknown',
      status: item.statusResult.status,
      value: item.statusResult.value,
      unit: item.sensor.unit || '',
      lastUpdate: item.statusResult.lastReading?.createdAt
        ? new Date(item.statusResult.lastReading.createdAt)
        : null,
      isPinned: pinned.has(item.sensor.sensor_id),
    }));

    // Sort: pinned first, then by status priority (critical > warning > offline > normal)
    const statusPriority = { critical: 0, warning: 1, offline: 2, normal: 3 };
    return items.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return statusPriority[a.status] - statusPriority[b.status];
    });
  });

  // Computed: Selected device detail
  selectedDeviceDetail = computed(() => {
    const sensorId = this.selectedSensorId();
    if (!sensorId) return null;

    const sensor = this.sensors().find((s) => s.sensor_id === sensorId);
    if (!sensor) return null;

    const statuses = this.sensorStatuses();
    const statusResult = statuses.find(
      (s, idx) => this.sensors()[idx].sensor_id === sensorId
    );
    if (!statusResult) return null;

    const timeRangeMs = this.getTimeRangeMs(this.filterState().timeRange);
    const chartData = this.readingsMap.getReadingsForSensor(sensorId, timeRangeMs);

    const thresholds = normalizeThresholds(sensor.type || '', {
      min: sensor.min_threshold ?? sensor.min_critical,
      max: sensor.max_threshold ?? sensor.max_critical,
      optimal_min: sensor.optimal_min ?? sensor.min_warning,
      optimal_max: sensor.optimal_max ?? sensor.max_warning,
    });

    // Calculate delta (1h ago vs now)
    let delta1h: number | undefined;
    if (chartData.length > 1) {
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const oldReading = chartData.find((r) => r.timestamp.getTime() <= oneHourAgo);
      if (oldReading) {
        delta1h = statusResult.value - oldReading.value;
      }
    }

    const detail: DeviceDetail = {
      id: sensor.sensor_id,
      name: sensor.sensor_id || 'Unknown',
      type: sensor.type || 'Unknown',
      status: statusResult.status,
      currentValue: statusResult.value,
      unit: sensor.unit || '',
      lastUpdate: statusResult.lastReading?.createdAt
        ? new Date(statusResult.lastReading.createdAt)
        : null,
      delta1h,
      thresholds: {
        min: thresholds.min,
        max: thresholds.max,
        optimalMin: thresholds.optimal_min,
        optimalMax: thresholds.optimal_max,
      },
      chartData: chartData.map((r) => ({ name: r.timestamp, value: r.value })),
    };

    return detail;
  });

  // Computed: Summary counts
  summaryCounts = computed(() => {
    const items = this.deviceListItems();
    return items.reduce(
      (acc, item) => {
        acc[item.status]++;
        return acc;
      },
      { normal: 0, warning: 0, critical: 0, offline: 0 } as SummaryCounts
    );
  });

  // Computed: Overall status
  overallStatus = computed(() => {
    const counts = this.summaryCounts();
    if (counts.critical > 0) return 'critical';
    if (counts.warning > 0) return 'warning';
    if (counts.offline === counts.normal + counts.warning + counts.critical + counts.offline && counts.offline > 0)
      return 'offline';
    return 'normal';
  });

  overallTitle = computed(() => {
    const status = this.overallStatus();
    const messages = {
      critical: this.languageService.t()('sensorReadings.criticalConditions'),
      warning: this.languageService.t()('sensorReadings.attentionNeeded'),
      offline: this.languageService.t()('sensorReadings.noData'),
      normal: this.languageService.t()('sensorReadings.allGood'),
    };
    return messages[status];
  });

  summarySubtitle = computed(() => {
    const total = this.deviceListItems().length;
    const selectedFarm = this.farmManagement.getSelectedFarm();
    if (selectedFarm) {
      return `${total} ${this.languageService.t()('sensors.title')} ${this.languageService.t()('common.in')} ${selectedFarm.name}`;
    }
    return `${total} ${this.languageService.t()('sensors.title')} ${this.languageService.t()('sensorReadings.acrossAllFarms')}`;
  });

  constructor() {
    // Sync URL to selection
    effect(() => {
      const sensorId = this.selectedSensorId();
      if (sensorId) {
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { sensor: sensorId },
          queryParamsHandling: 'merge',
        });
      }
    });
  }

  ngOnInit() {
    // Initial data load
    this.loadAllData();

    // Listen to farm selection changes
    this.farmManagement.selectedFarm$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((selectedFarm: Farm | null) => {
        if (selectedFarm) {
          this.filterState.update((state) => ({ ...state, farmId: selectedFarm.farm_id }));
          this.loadAllData();
        }
      });

    // Auto-refresh setup
    interval(10000)
      .pipe(
        startWith(0),
        switchMap(() => {
          if (this.autoRefreshEnabled()) {
            return this.softRefresh();
          }
          return EMPTY;
        }),
        catchError((err) => {
          console.error('Auto-refresh error:', err);
          return EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();

    // Restore selection from URL
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      if (params['sensor']) {
        this.selectedSensorId.set(params['sensor']);
      }
    });
  }

  async loadAllData() {
    this.loading.set(true);
    try {
      const [farms, devices, sensors, readings] = await Promise.all([
        firstValueFrom(this.apiService.getFarms()),
        firstValueFrom(this.apiService.getDevices(true)),
        firstValueFrom(this.apiService.getSensors()),
        firstValueFrom(this.apiService.getSensorReadings(200)),
      ]);

      this.farms.set(farms || []);
      this.devices.set(devices || []);
      this.sensors.set(this.enhanceSensorsWithThresholds(sensors || []));
      this.sensorReadings.set(readings || []);
      this.readingsMap.setReadings(readings || []);

      // Auto-select first item if none selected
      if (!this.selectedSensorId() && this.deviceListItems().length > 0) {
        this.selectedSensorId.set(this.deviceListItems()[0].id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      this.notifications.notify('critical', 'Error', 'Failed to load sensor data');
    } finally {
      this.loading.set(false);
    }
  }

  private async softRefresh() {
    try {
      const readings = await firstValueFrom(this.apiService.getSensorReadings(200));
      this.sensorReadings.set(readings || []);
      this.readingsMap.setReadings(readings || []);
    } catch (error) {
      console.error('Soft refresh error:', error);
    }
  }

  private enhanceSensorsWithThresholds(sensors: Sensor[]): SensorWithThresholds[] {
    return sensors.map((sensor) => ({
      ...sensor,
      name: `Sensor ${sensor.id}`,
      sensor_type: sensor.type,
    }));
  }

  private getTimeRangeMs(range: FilterState['timeRange']): number {
    const ranges = {
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
    };
    return ranges[range];
  }

  // Event handlers
  onFilterChange(changes: Partial<FilterState>) {
    this.filterState.update((state) => ({ ...state, ...changes }));
  }

  refreshData() {
    this.loadAllData();
  }

  toggleAutoRefresh(enabled: boolean) {
    this.autoRefreshEnabled.set(enabled);
  }

  toggleDensity(density: 'comfortable' | 'compact') {
    this.density.set(density);
  }

  selectSensor(sensorId: string) {
    this.selectedSensorId.set(sensorId);
  }

  togglePin(sensorId: string) {
    this.pinnedSensorIds.update((pinned) => {
      const newSet = new Set(pinned);
      if (newSet.has(sensorId)) {
        newSet.delete(sensorId);
      } else {
        newSet.add(sensorId);
      }
      return newSet;
    });
  }

  getOnlinePercentage(): number {
    const items = this.deviceListItems();
    if (items.length === 0) return 0;
    const online = items.filter(item => item.status !== 'offline').length;
    return Math.round((online / items.length) * 100);
  }
}

