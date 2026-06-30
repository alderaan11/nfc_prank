import {
  Component, OnInit, signal, ElementRef, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface MediaResponse {
  type: 'image' | 'video';
  url: string;
  name: string;
}

@Component({
  selector: 'app-random-media',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './random.component.html',
})
export class RandomMediaComponent implements OnInit {
  private http = inject(HttpClient);
  private el = inject(ElementRef);

  private apiRetries = 0;
  private mediaRetries = 0;
  private currentUrl = '';

  media = signal<MediaResponse | null>(null);
  error = signal<string | null>(null);
  loading = signal(true);
  needsTap = signal(false);

  ngOnInit() {
    this.loadNext();
  }

  loadNext() {
    this.loading.set(true);
    this.error.set(null);
    this.media.set(null);
    this.needsTap.set(false);
    this.mediaRetries = 0;

    const url = `${environment.apiUrl}/api/media/random?_t=${Date.now()}`;
    this.http.get<MediaResponse>(url).subscribe({
      next: (m) => {
        this.currentUrl = m.url;
        this.media.set(m);
        this.loading.set(false);
        if (m.type === 'video') this.needsTap.set(true);
      },
      error: () => {
        if (this.apiRetries < 2) {
          this.apiRetries++;
          setTimeout(() => this.loadNext(), 800);
        } else {
          this.error.set('Erreur de chargement');
          this.loading.set(false);
        }
      },
    });
  }

  // Appelé par (click) sur le bouton overlay — événement "trusted" sur iOS
  activateSound() {
    this.needsTap.set(false);
    const vid = this.el.nativeElement.querySelector('video') as HTMLVideoElement | null;
    if (!vid) return;

    // iOS Safari : muted doit être changé synchroniquement dans un click handler
    vid.muted = false;
    vid.volume = 1;

    // play() retourne une Promise sur les navigateurs modernes
    const p = vid.play();
    if (p) {
      p.catch(() => {
        // Fallback iOS : reload de la source sans muted puis re-play
        const src = vid.src;
        vid.src = '';
        vid.muted = false;
        vid.src = src;
        vid.play().catch(() => {});
      });
    }
  }

  onMediaError() {
    if (this.mediaRetries < 2) {
      this.mediaRetries++;
      const url = this.currentUrl;
      this.media.update(m => m ? { ...m, url: '' } : null);
      setTimeout(() => this.media.update(m => m ? { ...m, url } : null), 400);
    } else {
      this.error.set('Erreur de chargement');
      this.loading.set(false);
    }
  }
}
