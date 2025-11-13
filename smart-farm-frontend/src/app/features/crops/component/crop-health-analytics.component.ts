import { Component, OnInit, input, signal, computed, inject, DestroyRef, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { CropService, SensorWithReading } from '../../../core/services/crop.service';
import { SensorReading } from '../../../core/models/farm.model';

// Lazy load echarts for better initial bundle size
// import type { EChartsOption } from 'echarts';
type EChartsOption = any; // Placeholder until echarts is installed

@Component({
  selector: 'app-crop-health-analytics',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  template: `
    <mat-card class="health-analytics">
      <mat-card-header>
        <mat-card-title>
          <mat-icon>timeline</mat-icon>
          Health Analytics
        </mat-card-title>
        <mat-card-subtitle>
          Real-time sensor monitoring
        </mat-card-subtitle>
        <div class="header-actions">
          <button
            mat-icon-button
            [class.active]="timeRange() === 7"
            (click)="setTimeRange(7)"
            matTooltip="Last 7 days">
            <span class="range-label">7D</span>
          </button>
          <button
            mat-icon-button
            [class.active]="timeRange() === 30"
            (click)="setTimeRange(30)"
            matTooltip="Last 30 days">
            <span class="range-label">30D</span>
          </button>
          <button mat-icon-button (click)="refreshData()" matTooltip="Refresh">
            <mat-icon>refresh</mat-icon>
          </button>
        </div>
      </mat-card-header>

      <mat-card-content>
        <!-- Loading State -->
        <div *ngIf="loading()" class="loading-state">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Loading sensor data...</p>
        </div>

        <!-- Empty State -->
        <div *ngIf="!loading() && sensors().length === 0" class="empty-state">
          <mat-icon>sensors_off</mat-icon>
          <h3>No Sensors Connected</h3>
          <p>Connect sensors to this crop to start monitoring its health.</p>
        </div>

        <!-- Charts -->
        <div *ngIf="!loading() && sensors().length > 0" class="charts-container">
          <mat-tab-group>
            <!-- Moisture Chart -->
            <mat-tab *ngIf="moistureSensors().length > 0">
              <ng-template mat-tab-label>
                <mat-icon>water_drop</mat-icon>
                Soil Moisture
              </ng-template>
              <div class="chart-wrapper">
                <div class="chart-container">
                  <p class="chart-placeholder">Chart visualization ready - Install ngx-echarts to enable</p>
                  <!-- TODO: Add echarts directive after installing ngx-echarts -->
                </div>
                <div class="sensor-legend">
                  <div *ngFor="let sensor of moistureSensors()" class="sensor-item">
                    <span class="sensor-dot" [style.background]="getSensorColor(sensor)"></span>
                    <span class="sensor-name">{{ sensor.type }} ({{ sensor.location || 'No location' }})</span>
                    <span class="sensor-value" [class.critical]="sensor.status === 'critical'" [class.warning]="sensor.status === 'warning'">
                      {{ sensor.latestReading?.value1 !== undefined ? (sensor.latestReading?.value1 | number:'1.1-1') + (sensor.unit || '') : '--' }}
                    </span>
                  </div>
                </div>
              </div>
            </mat-tab>

            <!-- Temperature Chart -->
            <mat-tab *ngIf="temperatureSensors().length > 0">
              <ng-template mat-tab-label>
                <mat-icon>thermostat</mat-icon>
                Temperature
              </ng-template>
              <div class="chart-wrapper">
                <div class="chart-container">
                  <p class="chart-placeholder">Chart visualization ready - Install ngx-echarts to enable</p>
                  <!-- TODO: Add echarts directive after installing ngx-echarts -->
                </div>
                <div class="sensor-legend">
                  <div *ngFor="let sensor of temperatureSensors()" class="sensor-item">
                    <span class="sensor-dot" [style.background]="getSensorColor(sensor)"></span>
                    <span class="sensor-name">{{ sensor.type }} ({{ sensor.location || 'No location' }})</span>
                    <span class="sensor-value">
                      {{ sensor.latestReading?.value1 !== undefined ? (sensor.latestReading?.value1 | number:'1.1-1') + (sensor.unit || '') : '--' }}
                    </span>
                  </div>
                </div>
              </div>
            </mat-tab>

            <!-- Humidity Chart -->
            <mat-tab *ngIf="humiditySensors().length > 0">
              <ng-template mat-tab-label>
                <mat-icon>cloud</mat-icon>
                Humidity
              </ng-template>
              <div class="chart-wrapper">
                <div class="chart-container">
                  <p class="chart-placeholder">Chart visualization ready - Install ngx-echarts to enable</p>
                  <!-- TODO: Add echarts directive after installing ngx-echarts -->
                </div>
                <div class="sensor-legend">
                  <div *ngFor="let sensor of humiditySensors()" class="sensor-item">
                    <span class="sensor-dot" [style.background]="getSensorColor(sensor)"></span>
                    <span class="sensor-name">{{ sensor.type }} ({{ sensor.location || 'No location' }})</span>
                    <span class="sensor-value">
                      {{ sensor.latestReading?.value1 !== undefined ? (sensor.latestReading?.value1 | number:'1.1-1') + (sensor.unit || '') : '--' }}
                    </span>
                  </div>
                </div>
              </div>
            </mat-tab>
          </mat-tab-group>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .health-analytics {
      min-height: 500px;

      mat-card-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 1rem;

        mat-card-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.25rem;
        }

        .header-actions {
          display: flex;
          gap: 0.25rem;

          button {
            &.active {
              background: rgba(16, 185, 129, 0.1);
              color: var(--primary-green, #10b981);
            }

            .range-label {
              font-size: 0.85rem;
              font-weight: 600;
            }
          }
        }
      }

      mat-card-content {
        padding: 0 !important;
      }
    }

    .loading-state,
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 400px;
      color: rgba(0, 0, 0, 0.3);
      gap: 1rem;

      mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
      }

      h3 {
        margin: 0;
        color: rgba(0, 0, 0, 0.5);
      }

      p {
        margin: 0;
      }
    }

    .charts-container {
      ::ng-deep .mat-mdc-tab-group {
        .mat-mdc-tab-labels {
          background: rgba(0, 0, 0, 0.02);
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }

        .mat-mdc-tab-label {
          .mat-icon {
            margin-right: 0.5rem;
          }
        }
      }

        .chart-wrapper {
          padding: 1.5rem;

          .chart-container {
            width: 100%;
            height: 350px;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.02);
            border-radius: 8px;
            border: 2px dashed rgba(0, 0, 0, 0.1);
          }

          .chart-placeholder {
            color: rgba(0, 0, 0, 0.4);
            font-style: italic;
          }

        .sensor-legend {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          padding: 1rem;
          background: rgba(0, 0, 0, 0.02);
          border-radius: 8px;

          .sensor-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: white;
            border-radius: 6px;
            border: 1px solid rgba(0, 0, 0, 0.05);

            .sensor-dot {
              width: 12px;
              height: 12px;
              border-radius: 50%;
            }

            .sensor-name {
              flex: 1;
              font-size: 0.85rem;
              color: rgba(0, 0, 0, 0.7);
            }

            .sensor-value {
              font-weight: 600;
              color: var(--primary-green, #10b981);

              &.warning {
                color: #ff9800;
              }

              &.critical {
                color: #f44336;
              }
            }
          }
        }
      }
    }

    /* === DARK MODE SUPPORT === */
    :host-context(body.dark-theme) {
      .health-analytics {
        background: var(--card-bg, #1e293b);
        border-color: var(--border-color, #334155);
        
        mat-card-title {
          color: var(--text-primary, #f1f5f9);
        }
        
        mat-card-subtitle {
          color: var(--text-secondary, #94a3b8);
        }
        
        .header-actions button.active {
          background: rgba(16, 185, 129, 0.15);
          color: var(--primary-green, #10b981);
        }
      }
      
      .loading-state, .empty-state {
        color: var(--text-secondary, #94a3b8);
        
        h3 {
          color: var(--text-primary, #f1f5f9);
        }
        
        p {
          color: var(--text-secondary, #94a3b8);
        }
      }
      
      .charts-container {
        ::ng-deep .mat-mdc-tab-group {
          .mat-mdc-tab-labels {
            background: var(--light-bg, #0f172a);
            border-bottom-color: var(--border-color, #334155);
          }
          
          .mat-mdc-tab-label {
            color: var(--text-secondary, #94a3b8);
            
            &.mat-mdc-tab-label-active {
              color: var(--primary-green, #10b981);
            }
          }
        }
        
        .chart-wrapper {
          .chart-container {
            background: rgba(0, 0, 0, 0.3);
            border-color: var(--border-color, #334155);
          }
          
          .chart-placeholder {
            color: var(--text-secondary, #94a3b8);
          }
          
          .sensor-legend {
            background: var(--light-bg, #0f172a);
            
            .sensor-item {
              background: var(--card-bg, #1e293b);
              border-color: var(--border-color, #334155);
              
              &:hover {
                border-color: rgba(16, 185, 129, 0.4);
              }
              
              .sensor-name {
                color: var(--text-primary, #f1f5f9);
              }
              
              .sensor-value {
                color: var(--primary-green, #10b981);
              }
            }
          }
        }
      }
    }

    @media (max-width: 768px) {
      .charts-container .chart-wrapper .chart {
        height: 250px;
      }

      .sensor-legend {
        flex-direction: column;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CropHealthAnalyticsComponent implements OnInit {
  private cropService = inject(CropService);
  private destroyRef = inject(DestroyRef);

  // Inputs
  cropId = input.required<string>();
  sensors = input.required<SensorWithReading[]>();

  // Local state
  timeRange = signal<7 | 30>(7);
  loading = signal(false);
  chartLoading = signal(false);
  sensorReadings = signal<Map<string, SensorReading[]>>(new Map());

  // Computed sensors by type
  moistureSensors = computed(() =>
    this.sensors().filter(s => this.isSensorType(s, 'moisture'))
  );

  temperatureSensors = computed(() =>
    this.sensors().filter(s => this.isSensorType(s, 'temp'))
  );

  humiditySensors = computed(() =>
    this.sensors().filter(s => this.isSensorType(s, 'humidity') || this.isSensorType(s, 'humid'))
  );

  // Chart options
  moistureChartOptions = computed(() => this.buildChartOptions(
    this.moistureSensors(),
    'Soil Moisture Over Time',
    '%',
    '#2196f3'
  ));

  temperatureChartOptions = computed(() => this.buildChartOptions(
    this.temperatureSensors(),
    'Temperature Over Time',
    '°C',
    '#ff9800'
  ));

  humidityChartOptions = computed(() => this.buildChartOptions(
    this.humiditySensors(),
    'Humidity Over Time',
    '%',
    '#4caf50'
  ));

  // Effect to load data when sensors or time range changes
  constructor() {
    effect(() => {
      const sensors = this.sensors();
      const range = this.timeRange();
      if (sensors.length > 0) {
        this.loadSensorData();
      }
    });
  }

  ngOnInit(): void {
    this.loadSensorData();
  }

  setTimeRange(range: 7 | 30): void {
    this.timeRange.set(range);
  }

  refreshData(): void {
    this.loadSensorData(true);
  }

  private loadSensorData(forceRefresh = false): void {
    const sensors = this.sensors();
    if (sensors.length === 0) return;

    this.chartLoading.set(true);
    const range = this.timeRange();

    // CRITICAL: Load readings for ALL sensors in PARALLEL
    const readingRequests = sensors.map(sensor =>
      this.cropService.getSensorReadingsForChart(sensor.sensor_id, range, forceRefresh).pipe(
        map(readings => ({ sensorId: sensor.sensor_id, readings })),
        catchError(err => {
          console.error(`Error loading readings for sensor ${sensor.sensor_id}:`, err);
          return of({ sensorId: sensor.sensor_id, readings: [] });
        })
      )
    );

    // Use forkJoin to wait for all requests (PARALLEL execution)
    if (readingRequests.length === 0) {
      this.chartLoading.set(false);
      return;
    }

    forkJoin(readingRequests)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (results) => {
          const readingsMap = new Map<string, SensorReading[]>();
          results.forEach(({ sensorId, readings }) => {
            readingsMap.set(sensorId, readings);
          });
          this.sensorReadings.set(readingsMap);
          this.chartLoading.set(false);
        },
        error: (err) => {
          console.error('Error loading sensor data:', err);
          this.chartLoading.set(false);
        }
      });
  }

  private buildChartOptions(
    sensors: SensorWithReading[],
    title: string,
    unit: string,
    baseColor: string
  ): EChartsOption {
    const readingsMap = this.sensorReadings();

    // Build series data for each sensor
    const series = sensors.map((sensor, index) => {
      const readings = readingsMap.get(sensor.sensor_id) || [];
      const data = readings.map(r => [
        new Date(r.createdAt).getTime(),
        r.value1 || 0
      ]);

      return {
        name: `${sensor.type} (${sensor.location || 'Unknown'})`,
        type: 'line',
        smooth: true,
        data,
        lineStyle: {
          width: 2,
          color: this.getSensorColor(sensor)
        },
        itemStyle: {
          color: this.getSensorColor(sensor)
        },
        areaStyle: {
          opacity: 0.1,
          color: this.getSensorColor(sensor)
        },
        // Show threshold lines
        markLine: sensor.min_warning || sensor.max_warning ? {
          silent: true,
          lineStyle: {
            type: 'dashed',
            color: '#ff9800',
            width: 1
          },
          data: [
            sensor.min_warning ? { yAxis: sensor.min_warning, name: 'Min Warning' } : null,
            sensor.max_warning ? { yAxis: sensor.max_warning, name: 'Max Warning' } : null
          ].filter(Boolean)
        } : undefined
      };
    });

    return {
      title: {
        text: title,
        left: 'center',
        textStyle: {
          fontSize: 14,
          fontWeight: 'normal',
          color: 'rgba(0, 0, 0, 0.7)'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        },
        formatter: (params: any) => {
          if (!Array.isArray(params)) return '';
          const date = new Date(params[0].value[0]);
          let tooltip = `<strong>${date.toLocaleString()}</strong><br/>`;
          params.forEach((param: any) => {
            tooltip += `${param.marker} ${param.seriesName}: <strong>${param.value[1].toFixed(2)} ${unit}</strong><br/>`;
          });
          return tooltip;
        }
      },
      legend: {
        bottom: 0,
        left: 'center'
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '60px',
        top: '60px',
        containLabel: true
      },
      xAxis: {
        type: 'time',
        boundaryGap: false,
        axisLabel: {
          formatter: (value: number) => {
            const date = new Date(value);
            return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:00`;
          }
        }
      },
      yAxis: {
        type: 'value',
        name: unit,
        axisLabel: {
          formatter: `{value} ${unit}`
        },
        splitLine: {
          lineStyle: {
            type: 'dashed',
            opacity: 0.3
          }
        }
      },
      series,
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100
        },
        {
          start: 0,
          end: 100,
          height: 20,
          bottom: 30
        }
      ]
    };
  }

  getSensorColor(sensor: SensorWithReading): string {
    // Generate color based on sensor type
    if (this.isSensorType(sensor, 'moisture')) return '#2196f3';
    if (this.isSensorType(sensor, 'temp')) return '#ff9800';
    if (this.isSensorType(sensor, 'humidity')) return '#4caf50';
    return '#9e9e9e';
  }

  private isSensorType(sensor: SensorWithReading, type: string): boolean {
    return sensor.type.toLowerCase().includes(type.toLowerCase());
  }
}
