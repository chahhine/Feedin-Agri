import { Component, inject, HostListener, signal, OnDestroy, computed, ChangeDetectionStrategy } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ApiService } from '../../../core/services/api.service';
import { ActionEventsService } from '../../../core/services/action-events.service';
import { LanguageService } from '../../../core/services/language.service';
import { ThemeService, Theme } from '../../../core/services/theme.service';
import { FarmManagementService } from '../../../core/services/farm-management.service';
import { CustomDropdownComponent, DropdownItem } from '../custom-dropdown/custom-dropdown.component';
import { LanguageSwitcherComponent } from '../language-switcher/language-switcher.component';
import { Farm } from '../../../core/models/farm.model';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatBadgeModule,
    MatDividerModule,
    MatChipsModule,
    MatTooltipModule,
    CustomDropdownComponent,
    LanguageSwitcherComponent
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class HeaderComponent implements OnDestroy {
  private authService = inject(AuthService);
  public notificationService = inject(NotificationService);
  private actionEvents = inject(ActionEventsService);
  private api = inject(ApiService);
  public languageService = inject(LanguageService);
  public themeService = inject(ThemeService);
  private farmManagement = inject(FarmManagementService);
  private router = inject(Router);

  user = this.authService.user;
  isAuthenticated = this.authService.isAuthenticated;
  showMobileMenu = false;
  showFarmSelector = false;

  // Farm selector properties
  farmSearchQuery = '';
  filteredFarms: Farm[] = [];

  // Theme properties
  currentTheme$ = this.themeService.theme$;
  currentTheme = signal(this.themeService.currentTheme);

  // Farm management - computed from global service
  get farms() { return this.farmManagement.farms(); }
  get selectedFarm() { return this.farmManagement.selectedFarm(); }

  unreadCount: number = 0;

  // Store subscriptions for cleanup
  private subscriptions = new Subscription();
  private refreshInterval?: number;

  // Computed signals for better performance
  private navBorder = computed(() =>
    this.currentTheme() === 'dark'
      ? '0.5px solid rgba(255, 255, 255, 0.15)'
      : '0.5px solid rgba(0, 0, 0, 0.2)'
  );

  private actionBorder = computed(() =>
    this.currentTheme() === 'dark'
      ? '0.5px solid rgba(255, 255, 255, 0.15)'
      : '0.5px solid rgba(0, 0, 0, 0.2)'
  );

  constructor() {
    // Start global action events polling
    this.actionEvents.start();

    // Refresh unread count from backend periodically
    this.refreshUnread();
    this.refreshInterval = window.setInterval(() => this.refreshUnread(), 15000);

    // Initialize websocket for live notifications
    this.notificationService.initSocket();

    // Subscribe to new notifications
    this.subscriptions.add(
      this.notificationService.newNotification$.subscribe((notification) => {
        console.log('🔔 [HEADER] New notification received:', notification);
        this.unreadCount = (this.unreadCount || 0) + 1;
        console.log('📊 [HEADER] Updated unreadCount to:', this.unreadCount);
      })
    );

    // Subscribe to theme changes
    this.subscriptions.add(
      this.themeService.theme$.subscribe(theme => {
        this.currentTheme.set(theme);
      })
    );

    // Initialize filtered farms
    this.filteredFarms = this.farms;
  }

  ngOnInit(): void {
    // Component initialization
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscriptions.unsubscribe();

    // Clear interval
    if (this.refreshInterval) {
      window.clearInterval(this.refreshInterval);
    }

    // Restore body scroll
    document.body.style.overflow = '';
  }

  getUnreadBadge(): number {
    const live = this.notificationService.unreadSignal?.() ?? 0;
    const result = live || this.unreadCount || 0;
    console.log('🔔 [HEADER] getUnreadBadge - live:', live, 'unreadCount:', this.unreadCount, 'result:', result);
    return result;
  }

  // Debug method to test notifications
  testNotification() {
    console.log('🧪 [HEADER] Testing notification system');
    this.notificationService.testNotification();
  }
  toggleMobileMenu(): void {
    this.showMobileMenu = !this.showMobileMenu;

    // Prevent body scroll when mobile menu is open
    if (this.showMobileMenu) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  closeMobileMenu(): void {
    this.showMobileMenu = false;
    document.body.style.overflow = '';
  }

  // Close mobile menu when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const mobileMenu = target.closest('.mobile-menu');
    const mobileButton = target.closest('.mobile-menu-toggle');

    if (!mobileMenu && !mobileButton && this.showMobileMenu) {
      this.closeMobileMenu();
    }
  }


  // Prevent body scroll when component is destroyed with open menu
  @HostListener('window:beforeunload')
  onBeforeUnload(): void {
    document.body.style.overflow = '';
  }

  private async refreshUnread(): Promise<void> {
    try {
      const res = await this.api.getNotificationsUnreadCount().toPromise();
      const count = res?.count ?? 0;
      this.unreadCount = count;
      this.notificationService.setUnreadCountFromApi(count);
      if (count === 0) {
        this.notificationService.markAllRead();
      }
    } catch (error) {
      // Silently fail - optional: log to error tracking service
      if (error instanceof Error) {
        console.error('Failed to refresh unread count:', error.message);
      }
    }
  }

  logout(): void {
    this.closeMobileMenu();
    this.authService.logout();
  }

  // Get user initials for avatar
  getInitials(): string {
    const user = this.user();
    if (!user) return 'U';

    const firstName = user.first_name || '';
    const lastName = user.last_name || '';

    if (firstName && lastName) {
      return (firstName[0] + lastName[0]).toUpperCase();
    }

    if (firstName) {
      return firstName.substring(0, 2).toUpperCase();
    }

    if (user.email) {
      return user.email.substring(0, 2).toUpperCase();
    }

    return 'U';
  }

  // Navigate to full notifications page
  navigateToNotifications(): void {
    this.router.navigate(['/notifications']);
  }

  // Handle logo image error - show fallback icon
  onLogoError(event: Event): void {
    const target = event.target as HTMLImageElement;
    const fallbackIcon = target.nextElementSibling as HTMLElement;

    if (target && fallbackIcon) {
      target.style.display = 'none';
      fallbackIcon.style.display = 'flex';
    }
  }

  // Handle custom icon error - show fallback Material icon
  onIconError(event: Event, fallbackIconName: string): void {
    const target = event.target as HTMLImageElement;
    const fallbackIcon = target.nextElementSibling as HTMLElement;

    if (target && fallbackIcon) {
      target.style.display = 'none';
      fallbackIcon.style.display = 'flex';
      fallbackIcon.textContent = fallbackIconName;
    }
  }

  // Theme methods
  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  setTheme(theme: Theme): void {
    this.themeService.setTheme(theme);
  }

  // Dynamic icon filter based on theme
  getIconFilter(iconName: string): string {
    const currentTheme = this.currentTheme();

    // Live readings icon always shows original colors
    if (iconName.includes('Live_readings')) {
      return 'none';
    }

    // Dark mode: invert icons to white
    if (currentTheme === 'dark') {
      return 'invert(1)';
    }

    // Light mode: show original black icons
    return 'none';
  }

  // Dynamic border for navigation container
  getNavContainerBorder(): string {
    return this.navBorder();
  }

  // Dynamic border for action buttons
  getActionButtonBorder(): string {
    return this.actionBorder();
  }

  // Custom dropdown data
  userDropdownSections = [
    {
      title: 'Account',
      items: [
        {
          id: 'profile',
          label: 'Profile',
          subtitle: 'Manage your account',
          icon: 'person',
          routerLink: '/profile'
        },
        {
          id: 'settings',
          label: 'Settings',
          subtitle: 'Preferences & configuration',
          icon: 'settings',
          routerLink: '/settings'
        }
      ]
    },
    {
      title: 'Session',
      items: [
        {
          id: 'logout',
          label: 'Logout',
          subtitle: 'Sign out of your account',
          icon: 'logout',
          action: () => this.logout()
        }
      ]
    }
  ];

  languageDropdownItems: DropdownItem[] = [
    {
      id: 'en-US',
      label: 'English',
      subtitle: 'English',
      flag: 'https://flagcdn.com/w40/us.png',
      badge: 'EN'
    },
    {
      id: 'fr-FR',
      label: 'Français',
      subtitle: 'French',
      flag: 'https://flagcdn.com/w40/fr.png',
      badge: 'FR'
    },
    {
      id: 'ar-TN',
      label: 'العربية',
      subtitle: 'Arabic',
      flag: 'https://flagcdn.com/w40/tn.png',
      badge: 'AR'
    }
  ];

  onUserItemSelected(item: DropdownItem): void {
    if (item.action) {
      item.action();
    }
    // Router navigation is handled by routerLink in template
  }

  onLanguageItemSelected(item: DropdownItem): void {
    this.languageService.setLanguage(item.id);
  }

  getSelectedLanguageId(): string {
    return this.languageService.getCurrentLanguageCode();
  }

  // Farm Selector Methods
  toggleFarmSelector(): void {
    this.showFarmSelector = !this.showFarmSelector;
    if (this.showFarmSelector) {
      document.body.style.overflow = 'hidden';
      this.filteredFarms = this.farms;
      this.farmSearchQuery = '';
    } else {
      document.body.style.overflow = '';
    }
  }

  closeFarmSelector(): void {
    this.showFarmSelector = false;
    document.body.style.overflow = '';
    this.farmSearchQuery = '';
  }

  closeFarmSelectorOnBackdrop(event: Event): void {
    if (event.target === event.currentTarget) {
      this.closeFarmSelector();
    }
  }

  filterFarms(): void {
    const query = this.farmSearchQuery.toLowerCase().trim();
    if (!query) {
      this.filteredFarms = this.farms;
      return;
    }

    this.filteredFarms = this.farms.filter(farm =>
      farm.name.toLowerCase().includes(query) ||
      (farm.location && farm.location.toLowerCase().includes(query))
    );
  }

  getCurrentFarmName(): string {
    return this.farmManagement.getFarmDisplayName();
  }

  isSelectedFarm(farm: Farm): boolean {
    return this.selectedFarm?.farm_id === farm.farm_id;
  }

  selectFarmFromModal(farm: Farm): void {
    this.farmManagement.selectFarm(farm);
    this.closeFarmSelector();
  }

  getFarmDeviceCount(farm: Farm): number {
    // This would ideally come from the farm data or API
    // For now, return a placeholder
    return 0;
  }

  // Close farm selector on escape key
  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.showFarmSelector) {
      this.closeFarmSelector();
    } else if (this.showMobileMenu) {
      this.closeMobileMenu();
    }
  }
}
