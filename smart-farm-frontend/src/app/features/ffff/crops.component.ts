import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, forkJoin, throwError, of } from 'rxjs';
import { takeUntil, finalize, timeout, catchError, distinctUntilChanged, filter, debounceTime } from 'rxjs/operators';
import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
  private destroyRef = inject(DestroyRef);
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

  ngOnInit(): void {
    console.time('CropDashboard Init');
    this.loadInitialData();
    this.setupCropChangeWatcher();
  }

  /**
   * CRITICAL FIX: Use toObservable() instead of effect() to prevent signal feedback loops
   * This converts the signal to an observable stream that doesn't trigger re-evaluation
   * when signals are updated downstream.
   */
  private setupCropChangeWatcher(): void {
    toObservable(this.dashboardService.selectedCropId)
      .pipe(
        distinctUntilChanged(), // Only emit when crop ID actually changes
        filter(cropId => !!cropId && cropId !== this.lastLoadedCropId), // Skip nulls and duplicates
        debounceTime(100), // Debounce rapid changes (e.g., during navigation)
        filter(() => !this.isLoading() && !this.isLoadingData()), // Skip during loading states
        takeUntilDestroyed(this.destroyRef) // Auto-cleanup on destroy
      )
      .subscribe(cropId => {
        this.lastLoadedCropId = cropId!;
        this.loadCropData(cropId!);
      });
  }

  ngOnDestroy(): void {
    console.log('[CropsComponent] Component being destroyed, cleaning up...');
    console.timeEnd('CropDashboard Init');

    // Cancel any pending observables (takeUntilDestroyed handles most cleanup automatically)
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
          } else {
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
          this.cdr.markForCheck();

          // Auto-load first crop if one is selected
          // The toObservable watcher will handle subsequent changes
          const selectedId = this.selectedCropId();
          if (selectedId && crops.length > 0 && !this.lastLoadedCropId) {
            console.log('[CropsComponent] Auto-loading selected crop:', selectedId);
            this.lastLoadedCropId = selectedId;
            this.loadCropData(selectedId);
          }
        },
        error: (err) => {
          console.error('[CropsComponent] Error loading crops:', err);
          this.isLoading.set(false);
          this.cdr.markForCheck();
          this.showError(this.error() || this.languageService.translate('crops.dashboard.error'));
        }
      });
  }

  private loadCropData(cropId: string): void {
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

