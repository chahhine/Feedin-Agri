import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { catchError, of } from 'rxjs';
import { Crop } from '../../../core/models/farm.model';
import { CropDashboardService } from '../services/crop-dashboard.service';

export const cropsListResolver: ResolveFn<Crop[]> = () => {
  const service = inject(CropDashboardService);
  
  return service.loadCrops().pipe(
    catchError(() => of([]))
  );
};

