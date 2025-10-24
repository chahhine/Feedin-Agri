import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';

import { ApiService } from '../../core/services/api.service';
import { Crop, CropStatus } from '../../core/models/farm.model';

@Component({
  selector: 'app-crops',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatMenuModule
  ],
  templateUrl: './crops.component.html',
  styleUrl: './crops.component.scss'
})
export class CropsComponent implements OnInit {
  private apiService = inject(ApiService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  crops: Crop[] = [];
  isLoading = true;
  displayedColumns: string[] = ['name', 'variety', 'status', 'planting_date', 'expected_harvest_date', 'actions'];

  ngOnInit(): void {
    this.loadCrops();
  }

  private loadCrops(): void {
    this.isLoading = true;
    this.apiService.getCrops().subscribe({
      next: (crops) => {
        this.crops = crops;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading crops:', error);
        this.isLoading = false;
        this.snackBar.open('Error loading crops', 'Close', { duration: 3000 });
      }
    });
  }

  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'planted':
        return 'primary';
      case 'growing':
        return 'accent';
      case 'harvested':
        return 'basic';
      case 'failed':
        return 'warn';
      default:
        return 'basic';
    }
  }

  getStatusIcon(status: string): string {
    switch (status.toLowerCase()) {
      case 'planted':
        return 'eco';
      case 'growing':
        return 'trending_up';
      case 'harvested':
        return 'check_circle';
      case 'failed':
        return 'error';
      default:
        return 'help';
    }
  }

  addCrop(): void {
    // TODO: Implement add crop dialog
    this.snackBar.open('Add crop functionality coming soon', 'Close', { duration: 3000 });
  }

  editCrop(crop: Crop): void {
    // TODO: Implement edit crop dialog
    this.snackBar.open('Edit crop functionality coming soon', 'Close', { duration: 3000 });
  }

  deleteCrop(crop: Crop): void {
    if (confirm(`Are you sure you want to delete crop "${crop.name}"?`)) {
      this.apiService.deleteCrop(crop.crop_id).subscribe({
        next: () => {
          this.snackBar.open('Crop deleted successfully', 'Close', { duration: 3000 });
          this.loadCrops();
        },
        error: (error) => {
          console.error('Error deleting crop:', error);
          this.snackBar.open('Error deleting crop', 'Close', { duration: 3000 });
        }
      });
    }
  }

  refreshCrops(): void {
    this.loadCrops();
  }
}
