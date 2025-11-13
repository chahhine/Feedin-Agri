import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const snackBar = inject(MatSnackBar);
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An error occurred';
      let shouldLogout = false;

      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = error.error.message;
      } else if (error.status === 0) {
        // Connection refused or network error
        errorMessage = 'Unable to connect to server. Please check your connection.';
        // Don't logout on connection errors
      } else {
        // Server-side error
        switch (error.status) {
          case 401:
            // Only logout if it's an actual authentication failure, not a connection error
            // Check if we're already on login page or if this is an initial auth check
            const isAuthEndpoint = req.url.includes('/auth/') || req.url.includes('/users/register');
            const isOnLoginPage = router.url === '/login' || router.url === '/register';
            
            if (!isAuthEndpoint && !isOnLoginPage) {
              errorMessage = 'Your session has expired. Please login again.';
              shouldLogout = true;
            } else {
              errorMessage = 'Invalid credentials';
              // Don't logout if we're already on login/register pages
            }
            break;
          case 403:
            errorMessage = 'Access forbidden';
            break;
          case 404:
            errorMessage = 'Resource not found';
            break;
          case 500:
            errorMessage = 'Internal server error';
            break;
          default:
            errorMessage = error.error?.message || `Error ${error.status}: ${error.statusText}`;
        }
      }

      // Only show error message if it's not a silent auth check
      const isSilentAuthCheck = req.url.includes('/auth/me') || req.url.includes('/auth/csrf');
      if (!isSilentAuthCheck) {
        snackBar.open(errorMessage, 'Close', {
          duration: 5000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }

      // Logout only when explicitly needed
      if (shouldLogout) {
        authService.logout();
      }

      return throwError(() => error);
    })
  );
};
