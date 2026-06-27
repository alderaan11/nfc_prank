import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

const SESSION_KEY = 'nfc_session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _loggedIn = signal<boolean>(this.hasSession());

  readonly isLoggedIn = computed(() => this._loggedIn());

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, password: string) {
    return this.http
      .post(
        `${environment.apiUrl}/api/auth/callback/credentials`,
        { email, password, redirect: false },
        { withCredentials: true }
      )
      .pipe(
        tap(() => {
          sessionStorage.setItem(SESSION_KEY, '1');
          this._loggedIn.set(true);
        })
      );
  }

  logout() {
    sessionStorage.removeItem(SESSION_KEY);
    this._loggedIn.set(false);
    this.http
      .post(`${environment.apiUrl}/api/auth/signout`, {}, { withCredentials: true })
      .subscribe();
    this.router.navigate(['/login']);
  }

  private hasSession(): boolean {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  }
}
