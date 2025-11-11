import { Component, OnInit, OnDestroy, inject, signal, effect, ChangeDetectionStrategy, EffectRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, forkJoin, throwError, of } from 'rxjs';
import { takeUntil, finalize, timeout, catchError } from 'rxjs/operators';

// Services
import { CropDashboardService } from './services/crop-dashboard.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { LanguageService } from '../../core/services/language.service';

// Components
import { CropSelectorComponent } from './components/crop-selector/crop-selector.component';
import { CropKpisComponent } from './components/crop-kpis/crop-kpis.component';
import { HealthAnalyticsPanelComponent } from './components/health-analytics-panel/health-analytics-panel.component';
import { CropDetailsSidebarComponent } from './components/crop-details-sidebar/crop-details-sidebar.component';
import { SmartActionsPanelComponent } from './components/smart-actions-panel/smart-actions-panel.component';
import { EventsTimelineComponent } from './components/events-timeline/events-timeline.component';
import { MapComparisonTabsComponent } from './components/map-comparison-tabs/map-comparison-tabs.component';
import { SustainabilityMetricsComponent } from './components/sustainability-metrics/sustainability-metrics.component';

@Component({
  selector: 'app-crops',
  standalone: true,
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    TranslatePipe,
    CropSelectorComponent,
    CropKpisComponent,
    HealthAnalyticsPanelComponent,
    CropDetailsSidebarComponent,
    SmartActionsPanelComponent,
    EventsTimelineComponent,
    MapComparisonTabsComponent,
    SustainabilityMetricsComponent
  ],
  templateUrl: './crops.component.html',
  styleUrl: './crops.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CropsComponent implements OnInit, OnDestroy {
  private dashboardService = inject(CropDashboardService);
  private snackBar = inject(MatSnackBar);
  private languageService = inject(LanguageService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  // Signals for reactive state
  isLoading = signal<boolean>(true);
  isLoadingData = signal<boolean>(false);
  error = signal<string | null>(null);

  // Data signals
  crops = this.dashboardService.crops;
  selectedCropId = this.dashboardService.selectedCropId;
  selectedCrop = this.dashboardService.selectedCrop;

  kpis = signal<any>(null);
  analytics = signal<any>(null);
  events = signal<any>(null);
  comparisonData = signal<any>(null);
  sustainabilityMetrics = signal<any>(null);

  private lastLoadedCropId: string | null = null;
  private isInitialLoad = true;
  private cropChangeEffectRef?: EffectRef;
  private isComponentActive = true;
  private loadPending = false; // Prevent concurrent loads

  // Reactive crop change watcher: replaces setTimeout polling
  // CRITICAL FIX: Store effect reference for proper cleanup with debouncing

  constructor() {
    // Create effect with proper cleanup reference and debouncing
    // CRITICAL: Only runs when component is active to prevent route transition freezes
    this.cropChangeEffectRef = effect(() => {
      // Circuit breaker: don't run if component is being destroyed
      if (!this.isComponentActive) {
        return;
      }

      const currentCropId = this.selectedCropId();
      const loading = this.isLoading();
      const loadingData = this.isLoadingData();
      const cropsList = this.crops();

      // Skip during initial load or while any loading is in progress
      if (this.isInitialLoad || loading || loadingData || this.loadPending) {
        return;
      }

      // Only trigger if crop ID actually changed
      if (currentCropId && cropsList.length > 0) {
        if (currentCropId !== this.lastLoadedCropId) {
          this.lastLoadedCropId = currentCropId;
          this.loadPending = true;
          // Use setTimeout to break out of the effect cycle and prevent infinite loops
          setTimeout(() => {
            if (this.isComponentActive && !this.isLoadingData()) {
              this.loadCropData(currentCropId);
            }
            this.loadPending = false;
          }, 0);
        }
      } else if (!currentCropId && this.lastLoadedCropId !== null) {
        this.lastLoadedCropId = null;
        this.clearCropData();
        this.cdr.markForCheck();
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    console.time('CropDashboard Init');
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    console.log('[CropsComponent] Component being destroyed, cleaning up...');
    console.timeEnd('CropDashboard Init');
    
    // CRITICAL FIX: Mark component as inactive FIRST to stop effect
    this.isComponentActive = false;
    
    // Destroy the effect to prevent it from running after component destruction
    if (this.cropChangeEffectRef) {
      this.cropChangeEffectRef.destroy();
      this.cropChangeEffectRef = undefined;
    }
    
    // Cancel any pending observables
    this.destroy$.next();
    this.destroy$.complete();
    
    // Clear data to free memory
    this.clearCropData();
    
    console.log('[CropsComponent] Cleanup complete');
  }

  private loadInitialData(): void {
    console.log('[CropsComponent] Loading initial data...');
    this.isLoading.set(true);
    this.error.set(null);

    this.dashboardService.loadCrops()
      .pipe(
        timeout(10000), // 10 second timeout for initial load
        catchError((err) => {
          console.error('[CropsComponent] Error loading crops:', err);
          if (err.name === 'TimeoutError' || err.message?.includes('timeout')) {
            this.error.set('Failed to load crops: Request timed out. Check backend connection.');

            this.error.set(this.languageService.translate('crops.dashboard.error'));
          }
          return throwError(() => err);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
      next: (crops) => {
          console.log('[CropsComponent] Crops loaded successfully:', crops.length);
          this.isLoading.set(false);
          this.isInitialLoad = false;
          this.cdr.markForCheck();

          // Auto-load first crop if one is selected
          const selectedId = this.selectedCropId();
          if (selectedId && crops.length > 0) {
            console.log('[CropsComponent] Auto-loading selected crop:', selectedId);
            // Use setTimeout to allow effect to settle first
            setTimeout(() => {
              if (this.isComponentActive) {
                this.loadCropData(selectedId);
              }
            }, 100);
          }
        },
        error: (err) => {
          console.error('[CropsComponent] Error loading crops:', err);
          this.isLoading.set(false);
          this.isInitialLoad = false;
          this.cdr.markForCheck();
          this.showError(this.error() || this.languageService.translate('crops.dashboard.error'));
        }
      });
  }

  private loadCropData(cropId: string): void {
    // Circuit breaker: don't load if component is being destroyed
    if (!this.isComponentActive) {
      console.log('[CropsComponent] Component inactive, aborting data load');
      return;
    }

    // Prevent multiple simultaneous loads
    if (this.isLoadingData()) {
      console.log('[CropsComponent] Already loading data, skipping...');
      return;
    }

    console.log('[CropsComponent] Loading crop data for:', cropId);
    this.isLoadingData.set(true);
    this.error.set(null);

    // Combine all API calls into one using forkJoin for better performance
    // CRITICAL FIX: Add timeout to each call AND overall forkJoin to prevent freezing
    forkJoin({
      kpis: this.dashboardService.getCropKPIs(cropId).pipe(
        timeout(5000), // 5 second timeout per call
        catchError((err) => {
          console.warn('[CropsComponent] KPIs failed, using fallback:', err);
          return of({ yield: 0, yieldUnit: 'kg', growthStage: 'unknown', irrigationStatus: 'Unknown', healthScore: 0 });
        })
      ),
      analytics: this.dashboardService.getCropAnalytics(cropId).pipe(
        timeout(10000), // 10 seconds for analytics (more complex)
        catchError((err) => {
          console.warn('[CropsComponent] Analytics failed, using fallback:', err);
          return of({ soilMoisture: [], temperature: [], humidity: [], sunlight: [] });
        })
      ),
      events: this.dashboardService.getCropEvents(cropId).pipe(
        timeout(5000),
        catchError((err) => {
          console.warn('[CropsComponent] Events failed, using fallback:', err);
          return of([]);
        })
      ),
      metrics: this.dashboardService.getSustainabilityMetrics(cropId).pipe(
        timeout(3000),
        catchError((err) => {
          console.warn('[CropsComponent] Metrics failed, using fallback:', err);
          return of({ waterSaved: 0, energySaved: 0, co2Reduction: 0, irrigationEfficiency: 0 });
        })
      ),
      comparison: this.dashboardService.getCropComparison().pipe(
        timeout(5000),
        catchError((err) => {
          console.warn('[CropsComponent] Comparison failed, using fallback:', err);
          return of([]);
        })
      )
    }).pipe(
      timeout(15000), // Overall timeout: 15 seconds max
      catchError((err) => {
        // If forkJoin fails, return partial data instead of crashing
        console.error('[CropsComponent] forkJoin failed, returning partial data:', err);

        // Return fallback data structure
        const fallbackData = {
          kpis: { yield: 0, yieldUnit: 'kg', growthStage: 'unknown', irrigationStatus: 'Unknown', healthScore: 0 },
          analytics: { soilMoisture: [], temperature: [], humidity: [], sunlight: [] },
          events: [],
          metrics: { waterSaved: 0, energySaved: 0, co2Reduction: 0, irrigationEfficiency: 0 },
          comparison: []
        };

        // If it's a timeout error, show specific message
        if (err.name === 'TimeoutError' || err.message?.includes('timeout')) {
          this.error.set('Request timed out. Backend may be slow or unavailable.');
          this.showError('Request timed out. Please check your connection and try again.');
        } else {
          this.error.set(this.languageService.translate('crops.dashboard.error'));
          this.showError(this.languageService.translate('crops.dashboard.error'));
        }

        return throwError(() => err);
      }),
      takeUntil(this.destroy$),
      finalize(() => this.isLoadingData.set(false))
    ).subscribe({
      next: (data) => {
        console.log('[CropsComponent] All crop data loaded successfully');
        this.kpis.set(data.kpis);
        this.analytics.set(data.analytics);
        this.events.set(data.events);
        this.sustainabilityMetrics.set(data.metrics);
        this.comparisonData.set(data.comparison);
        this.error.set(null); // Clear any previous errors
        this.cdr.markForCheck(); // Trigger change detection for OnPush
      },
      error: (err) => {
        console.error('[CropsComponent] Error loading crop data:', err);
        this.lastLoadedCropId = null; // Reset to allow retry

        // Set fallback data so UI doesn't break
        this.kpis.set({ yield: 0, yieldUnit: 'kg', growthStage: 'unknown', irrigationStatus: 'Unknown', healthScore: 0 });
        this.analytics.set({ soilMoisture: [], temperature: [], humidity: [], sunlight: [] });
        this.events.set([]);
        this.sustainabilityMetrics.set({ waterSaved: 0, energySaved: 0, co2Reduction: 0, irrigationEfficiency: 0 });
        this.comparisonData.set([]);

        // Error message already set in catchError above
      }
    });
  }

  private clearCropData(): void {
    this.kpis.set(null);
    this.analytics.set(null);
    this.events.set(null);
    this.comparisonData.set(null);
    this.sustainabilityMetrics.set(null);
  }

  onCropSelected(cropId: string): void {
    this.dashboardService.selectCrop(cropId);
  }

  onActionExecuted(action: string): void {
    const cropId = this.selectedCropId();
    if (!cropId) {
      this.showError(this.languageService.translate('crops.dashboard.noCropSelected'));
      return;
    }

    this.dashboardService.executeAction(cropId, action)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result: any) => {
          if (result && result.ok) {
            this.showSuccess(this.languageService.translate('crops.actions.actionExecuted'));
            // Reload events to show the new action
            this.dashboardService.getCropEvents(cropId)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (events) => {
                  this.events.set(events);
                  this.cdr.markForCheck();
                },
                error: (err) => console.error('Error reloading events:', err)
              });
          } else {
            this.showError(this.languageService.translate('crops.actions.actionFailed'));
          }
        },
        error: (err) => {
          console.error('Error executing action:', err);
          this.showError(this.languageService.translate('crops.actions.actionFailed'));
        }
      });
    }

  private showSuccess(message: string): void {
    this.snackBar.open(message, this.languageService.translate('common.close'), {
      duration: 3000,
      panelClass: 'success-snackbar'
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, this.languageService.translate('common.close'), {
      duration: 5000,
      panelClass: 'error-snackbar'
    });
  }
}

