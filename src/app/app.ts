import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { PortalService } from './services/portal.service';
import { ScreenType } from './models/portal.types';
import { LoginComponent } from './components/login/login';
import { RegisterComponent } from './components/register/register';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password';
import { ResetPasswordComponent } from './components/reset-password/reset-password';
import { DashboardComponent } from './components/dashboard/dashboard';
import { BookingComponent } from './components/booking/booking';
import { AppointmentsComponent } from './components/appointments/appointments';
import { ProfileComponent } from './components/profile/profile';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LoginComponent,
    RegisterComponent,
    ForgotPasswordComponent,
    ResetPasswordComponent,
    DashboardComponent,
    BookingComponent,
    AppointmentsComponent,
    ProfileComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly portalService = inject(PortalService);
  readonly currentScreen = this.portalService.currentScreen;
  readonly showQuickSwitcher = signal<boolean>(true);

  setScreen(screen: ScreenType) {
    this.portalService.setScreen(screen);
  }

  toggleSwitcher() {
    this.showQuickSwitcher.update((v) => !v);
  }

  isPatientPortalScreen(): boolean {
    const s = this.currentScreen();
    return s === 'dashboard' || s === 'solicitar' || s === 'mis-citas' || s === 'perfil';
  }
}
