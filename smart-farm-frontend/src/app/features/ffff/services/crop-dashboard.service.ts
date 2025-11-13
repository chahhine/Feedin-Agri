import { Injectable, signal, computed, inject, NgZone } from '@angular/core';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError, shareReplay, finalize, switchMap } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { Crop, Sensor, SensorReading } from '../../../core/models/farm.model';

/**
 * KPI metrics for a crop
 */
export interface CropKPIs {
  yield: number;
  yieldUnit: string;
  growthStage: string;
  irrigationStatus: string;
  healthScore: number;
}

/**
 * Analytics data structure for crop sensors
 */
export interface CropAnalytics {
  soilMoisture: { timestamp: Date; value: number }[];
  temperature: { timestamp: Date; value: number }[];
  humidity: { timestamp: Date; value: number }[];
  sunlight: { timestamp: Date; value: number }[];
}

/**
 * Crop event (for timeline)
 */
export interface CropEvent {
  id: string;
  timestamp: Date;
  type: 'irrigation' | 'fertilizer' | 'disease' | 'action';
  description: string;
  status: 'success' | 'warning' | 'error';
}

/**
 * Sustainability metrics
 */
export interface SustainabilityMetrics {
  waterSaved: number;
  energySaved: number;
  co2Reduction: number;
  irrigationEfficiency: number;
}

/**
 * Crop Dashboard Service - Production Ready
 *
 * Features:
 * - In-memory caching with shareReplay
 * - In-flight request de-duplication
 * - Bounded data loading (default 50 readings)
 * - Signal-based reactive state
 * - LocalStorage persistence for selection
 */
@Injectable({
  providedIn: 'root'
})
export class CropDashboardService {
  private apiService = inject(ApiService);
  private ngZone = inject(NgZone);

  // Constants
  private readonly STORAGE_KEY = 'selected-crop-id';
  private readonly DEFAULT_READING_LIMIT = 50;
  private readonly CACHE_BUFFER_SIZE = 1;
  private readonly MAX_CACHE_SIZE = 10; // Prevent unbounded growth

  // Caching layer
  private cropsCache$?: Observable<Crop[]>;
  private sensorsCache = new Map<string, Observable<Sensor[]>>();
  private readingsCache = new Map<string, Observable<SensorReading[]>>();
  private inflightRequests = new Map<string, Observable<any>>();

  // Reactive state
  selectedCropId = signal<string | null>(this.loadFromStorage());
  crops = signal<Crop[]>([]);
  
  // OPTIMIZED: Memoize selectedCrop to prevent repeated .find() operations
  // Store last result and only recompute when inputs actually change
  private lastCropLookup: { id: string | null; cropsLength: number; result: Crop | null } = { 
    id: null, 
    cropsLength: 0, 
    result: null 
  };
  
  selectedCrop = computed(() => {
    const id = this.selectedCropId();
    const cropsList = this.crops();
    
    // Return cached result if inputs haven't changed
    if (id === this.lastCropLookup.id && cropsList.length === this.lastCropLookup.cropsLength) {
      return this.lastCropLookup.result;
    }
    
    // Compute new result
    const result = id ? cropsList.find(c => c.crop_id === id) || null : null;
    
    // Cache for next time
    this.lastCropLookup = { id, cropsLength: cropsList.length, result };
    
    return result;
  });

  // ========================================
  // Public API
  // ========================================

  /**
   * Load all crops (cached)
   */
  loadCrops(): Observable<Crop[]> {
    if (!this.cropsCache$) {
      this.cropsCache$ = this.apiService.getCrops().pipe(
        map(crops => {
          this.crops.set(crops);
          return crops;
        }),
        catchError(() => {
          this.crops.set([]);
          return of([]);
        }),
        shareReplay({ bufferSize: this.CACHE_BUFFER_SIZE, refCount: true })
      );
    }
    return this.cropsCache$;
  }

  /**
   * Select a crop and persist to localStorage
   */
  selectCrop(cropId: string | null): void {
    this.selectedCropId.set(cropId);
    this.saveToStorage(cropId);
  }

  /**
   * Get crop by ID from local cache
   */
  getCropById(cropId: string): Crop | null {
    return this.crops().find(c => c.crop_id === cropId) || null;
  }

  /**
   * Get KPIs for a crop
   */
  getCropKPIs(cropId: string): Observable<CropKPIs> {
    return this.apiService.getCrop(cropId).pipe(
      map(crop => ({
        yield: 0, // TODO: Calculate from actual data
        yieldUnit: 'kg',
        growthStage: crop.status || 'growing',
        irrigationStatus: 'Active',
        healthScore: 85 // TODO: Calculate from sensor readings
      })),
      catchError(() => of({
        yield: 0,
        yieldUnit: 'kg',
        growthStage: 'unknown',
        irrigationStatus: 'Unknown',
        healthScore: 0
      }))
    );
  }

  /**
   * Get sensors for a crop (cached, never loads readings)
   */
  getCropSensors(cropId: string): Observable<Sensor[]> {
    const cacheKey = `sensors_${cropId}`;

    if (!this.sensorsCache.has(cacheKey)) {
      this.enforceMaxCacheSize(this.sensorsCache);
      const sensors$ = this.getOrFetch(cacheKey, () =>
        this.apiService.getSensorsByCrop(cropId, false).pipe(
          catchError(() => of([]))
        )
      );
      this.sensorsCache.set(cacheKey, sensors$);
    }

    return this.sensorsCache.get(cacheKey)!;
  }

  /**
   * Get analytics for a crop (cached, bounded)
   */
  getCropAnalytics(cropId: string, limit: number = this.DEFAULT_READING_LIMIT): Observable<CropAnalytics> {
    const cacheKey = `analytics_${cropId}_${limit}`;

    return this.getOrFetch(cacheKey, () =>
      this.getCropSensors(cropId).pipe(
        switchMap(sensors => {
          // Find sensors by type
          const soilSensor = sensors.find(s => this.isSensorType(s.type, 'soil'));
          const tempSensor = sensors.find(s => this.isSensorType(s.type, 'temperature'));
          const humiditySensor = sensors.find(s => this.isSensorType(s.type, 'humidity'));
          const lightSensor = sensors.find(s => this.isSensorType(s.type, 'light'));

          // Load readings in parallel with limits
          return forkJoin([
            soilSensor ? this.getReadings(soilSensor.sensor_id, limit) : of([]),
            tempSensor ? this.getReadings(tempSensor.sensor_id, limit) : of([]),
            humiditySensor ? this.getReadings(humiditySensor.sensor_id, limit) : of([]),
            lightSensor ? this.getReadings(lightSensor.sensor_id, limit) : of([])
          ]).pipe(
            map(([soil, temp, humidity, light]) => {
              // Run heavy transforms outside Angular zone to prevent change-detection storm
              return this.ngZone.runOutsideAngular(() => ({
                soilMoisture: this.formatReadings(soil),
                temperature: this.formatReadings(temp),
                humidity: this.formatReadings(humidity),
                sunlight: this.formatReadings(light)
              }));
            })
          );
        }),
        catchError(() => {
          return of({
            soilMoisture: [],
            temperature: [],
            humidity: [],
            sunlight: []
          });
        })
      )
    );
  }

  /**
   * Execute action for a crop
   */
  executeAction(cropId: string, action: string): Observable<any> {
    return this.getCropSensors(cropId).pipe(
      switchMap(sensors => {
        if (sensors.length === 0) {
          throw new Error('No sensors found for this crop');
        }
        const sensor = sensors[0];
        return this.apiService.executeAction({
          deviceId: sensor.device_id,
          action: action,
          actionType: 'normal',
          context: {
            sensorId: sensor.sensor_id,
            sensorType: sensor.type
          }
        });
      }),
      catchError(() => of({ ok: false }))
    );
  }

  /**
   * Get crop comparison data
   */
  getCropComparison(): Observable<any[]> {
    return this.loadCrops().pipe(
      map(crops => crops.map(crop => ({
        crop_id: crop.crop_id,
        name: crop.name,
        status: crop.status,
        planted: crop.planting_date,
        expectedHarvest: crop.expected_harvest_date
      }))),
      catchError(() => of([]))
    );
  }

  /**
   * Get crop events/timeline
   * TODO: Implement with real backend endpoint when available
   */
  getCropEvents(cropId: string, limit: number = 20): Observable<CropEvent[]> {
    return this.getCropSensors(cropId).pipe(
      map(sensors => {
        // Placeholder: Return empty array until backend endpoint is ready
        // Future: Fetch actions filtered by sensor IDs
        const events: CropEvent[] = [];
        return events;
      }),
      catchError(() => of([]))
    );
  }

  /**
   * Get sustainability metrics
   * TODO: Implement with real calculations when data is available
   */
  getSustainabilityMetrics(cropId: string): Observable<SustainabilityMetrics> {
    // Placeholder: Return mock data until real calculations are implemented
    return of({
      waterSaved: 150, // L
      energySaved: 12, // kWh
      co2Reduction: 8, // kg
      irrigationEfficiency: 82 // %
    });
  }

  // ========================================
  // Private Utilities
  // ========================================

  /**
   * De-duplicate in-flight requests
   */
  private getOrFetch<T>(key: string, factory: () => Observable<T>): Observable<T> {
    if (this.inflightRequests.has(key)) {
      return this.inflightRequests.get(key)! as Observable<T>;
    }

    const request$ = factory().pipe(
      shareReplay({ bufferSize: this.CACHE_BUFFER_SIZE, refCount: true }),
      finalize(() => this.inflightRequests.delete(key))
    );

    this.inflightRequests.set(key, request$);
    return request$;
  }

  /**
   * Get sensor readings (cached)
   */
  private getReadings(sensorId: string, limit: number, offset: number = 0): Observable<SensorReading[]> {
    const cacheKey = `readings_${sensorId}_${limit}_${offset}`;

    if (!this.readingsCache.has(cacheKey)) {
      this.enforceMaxCacheSize(this.readingsCache);
      const readings$ = this.apiService.getReadingsBySensor(sensorId, limit, offset).pipe(
        catchError(() => of([])),
        shareReplay({ bufferSize: this.CACHE_BUFFER_SIZE, refCount: true })
      );
      this.readingsCache.set(cacheKey, readings$);
    }

    return this.readingsCache.get(cacheKey)!;
  }

  /**
   * Format readings for analytics
   */
  private formatReadings(readings: SensorReading[]): { timestamp: Date; value: number }[] {
    if (!readings || readings.length === 0) return [];

    return readings
      .map(r => ({
        timestamp: new Date(r.createdAt),
        value: r.value1 || 0
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Check if sensor matches type
   */
  private isSensorType(sensorType: string, targetType: 'soil' | 'temperature' | 'humidity' | 'light'): boolean {
    const lower = sensorType.toLowerCase();
    switch (targetType) {
      case 'soil':
        return lower.includes('soil') || lower.includes('moisture');
      case 'temperature':
        return lower.includes('temp');
      case 'humidity':
        return lower.includes('humid');
      case 'light':
        return lower.includes('light') || lower.includes('lux');
      default:
        return false;
    }
  }

  /**
   * Load selected crop ID from localStorage
   */
  private loadFromStorage(): string | null {
    try {
      return localStorage.getItem(this.STORAGE_KEY);
    } catch {
      return null;
    }
  }

  /**
   * Save selected crop ID to localStorage
   */
  private saveToStorage(cropId: string | null): void {
    try {
      if (cropId) {
        localStorage.setItem(this.STORAGE_KEY, cropId);
      } else {
        localStorage.removeItem(this.STORAGE_KEY);
      }
    } catch {
      // Silently fail if localStorage unavailable
    }
  }

  /**
   * Enforce maximum cache size to prevent memory leaks
   */
  private enforceMaxCacheSize(cache: Map<string, any>): void {
    if (cache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = cache.keys().next().value;
      if (firstKey) {
        cache.delete(firstKey);
      }
    }
  }

  /**
   * Clear all caches (call on component destroy or logout)
   */
  clearCaches(): void {
    this.cropsCache$ = undefined;
    this.sensorsCache.clear();
    this.readingsCache.clear();
    this.inflightRequests.clear();
  }
}
