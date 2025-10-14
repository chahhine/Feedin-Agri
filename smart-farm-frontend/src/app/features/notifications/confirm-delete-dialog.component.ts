import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-confirm-delete-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h3 mat-dialog-title class="title">
      <mat-icon color="warn">delete</mat-icon>
      Delete notification?
    </h3>
    <div mat-dialog-content class="content">
      <p>This action cannot be undone.</p>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="warn" (click)="onConfirm()">Delete</button>
    </div>
  `,
  styles: [`
    .title { display: flex; align-items: center; gap: 8px; margin: 0; }
    .content { min-width: 260px; }
  `]
})
export class ConfirmDeleteDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDeleteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {}

  onCancel() { this.dialogRef.close(false); }
  onConfirm() { this.dialogRef.close(true); }
}


