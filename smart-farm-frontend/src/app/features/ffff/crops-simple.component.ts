import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { Router, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { finalize, distinctUntilChanged, filter } from 'rxjs/operators';
import { CropDashboardService, CropKPIs } from './services/crop-dashboard.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';

/**
 * SIMPLIFIED CROPS COMPONENT - Production Ready
 * OnPush change detection, URL sync, lazy analytics, caching
 */
@Component({
  selector: 'app-crops-simple',
  standalone: true,
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatButtonModule,
    TranslatePipe
  ],
  templateUrl: './crops-simple.component.html',
  styleUrl: './crops-simple.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CropsSimpleComponent implements OnInit, OnDestroy {
  private dashboardService = inject(CropDashboardService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  private lastLoadedCropId: string | null = null;

  // Feature flags (toggle to enhance gradually)
  featureFlags = {
    kpis: true,
    sensorsSummary: true,
    analytics: false,
    actions: false
  };

  // Signals from service
  crops = this.dashboardService.crops;
  selectedCropId = this.dashboardService.selectedCropId;
  selectedCrop = this.dashboardService.selectedCrop;

  // Local state
  isLoading = signal(true);
  error = signal<string | null>(null);

  // Enhancement: KPIs + Sensors summary
  kpis = signal<CropKPIs | null>(null);
  loadingKpis = signal(false);
  kpisError = signal<string | null>(null);

  sensorsCount = signal<number>(0);
  loadingSensors = signal(false);
  sensorsError = signal<string | null>(null);

  ngOnInit(): void {
    // Load crops once
    this.loadCrops();

    // Watch for crop selection changes using toObservable (prevents effect feedback loops)
    toObservable(this.dashboardService.selectedCropId)
      .pipe(
        distinctUntilChanged(),
        filter(cropId => !!cropId && cropId !== this.lastLoadedCropId),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(cropId => {
        this.lastLoadedCropId = cropId!;
        
        // Load KPIs and sensors for the selected crop
        if (this.featureFlags.kpis) this.loadKpis(cropId!);
        if (this.featureFlags.sensorsSummary) this.loadSensorsSummary(cropId!);
      });
  }

  ngOnDestroy(): void {
    // Clear service caches to prevent memory leaks
    this.dashboardService.clearCaches();
  }

  private loadCrops(): void {
    this.dashboardService.loadCrops()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (crops) => {
          this.isLoading.set(false);

          // Handle URL precedence: ?crop > localStorage > first crop
          const cropIdFromUrl = this.route.snapshot.queryParamMap.get('crop');
          if (cropIdFromUrl && crops.some(c => c.crop_id === cropIdFromUrl)) {
            this.dashboardService.selectCrop(cropIdFromUrl);
          } else if (!this.selectedCropId() && crops.length > 0) {
            // Auto-select first crop if none selected
            this.dashboardService.selectCrop(crops[0].crop_id);
            this.syncUrlWithSelection(crops[0].crop_id);
          } else if (this.selectedCropId()) {
            // Sync URL with current selection
            this.syncUrlWithSelection(this.selectedCropId()!);
          }
        },
        error: () => {
          this.error.set('Failed to load crops. Please try again.');
          this.isLoading.set(false);
        }
      });
  }

  onCropSelected(cropId: string): void {
    this.dashboardService.selectCrop(cropId);
    this.syncUrlWithSelection(cropId);
  }

  private syncUrlWithSelection(cropId: string): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { crop: cropId },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  retry(): void {
    this.error.set(null);
    this.isLoading.set(true);
    this.loadCrops();
  }

  private loadKpis(cropId: string): void {
    this.loadingKpis.set(true);
    this.kpisError.set(null);
    this.dashboardService.getCropKPIs(cropId)
      .pipe(
        finalize(() => this.loadingKpis.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (k) => this.kpis.set(k),
        error: () => this.kpisError.set('Failed to load KPIs.')
      });
  }

  private loadSensorsSummary(cropId: string): void {
    this.loadingSensors.set(true);
    this.sensorsError.set(null);
    this.dashboardService.getCropSensors(cropId)
      .pipe(
        finalize(() => this.loadingSensors.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (sensors) => this.sensorsCount.set(sensors.length),
        error: () => this.sensorsError.set('Failed to load sensors.')
      });
  }
}
