import {
  Component, OnInit, OnDestroy, signal, ElementRef, inject
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
export class RandomMediaComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private el = inject(ElementRef);

  // Séparation des retry : API (compteur) vs proxy (image/vidéo)
  private apiRetries = 0;
  private mediaRetries = 0;
  private currentUrl = '';

  media = signal<MediaResponse | null>(null);
  error = signal<string | null>(null);
  loading = signal(true);
  needsTap = signal(false);

  private clickHandler = () => this.activateSound();

  ngOnInit() {
    this.loadNext();
  }

  ngOnDestroy() {
    document.removeEventListener('click', this.clickHandler);
    document.removeEventListener('touchstart', this.clickHandler);
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
        if (m.type === 'video') {
          this.needsTap.set(true);
          document.addEventListener('click', this.clickHandler, { once: true });
          document.addEventListener('touchstart', this.clickHandler, { once: true });
        }
      },
      error: () => {
        // Erreur API → retry sans incrémenter le compteur (même ?_t suffit pas,
        // mais l'API gère l'idempotence côté serveur)
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

  // Erreur de chargement image/vidéo (proxy) — on réessaie la MÊME URL,
  // pas question d'appeler loadNext() qui incrémenterait le compteur.
  onMediaError() {
    if (this.mediaRetries < 2) {
      this.mediaRetries++;
      const url = this.currentUrl;
      // Force le navigateur à re-fetcher en réinitialisant le src
      this.media.update(m => m ? { ...m, url: '' } : null);
      setTimeout(() => this.media.update(m => m ? { ...m, url } : null), 400);
    } else {
      this.error.set('Erreur de chargement');
      this.loading.set(false);
    }
  }

  private activateSound() {
    this.needsTap.set(false);
    const vid = this.el.nativeElement.querySelector('video') as HTMLVideoElement | null;
    if (!vid) return;
    vid.muted = false;
    vid.volume = 1;
    if (vid.paused) vid.play();
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const source = ctx.createMediaElementSource(vid);
      const gain = ctx.createGain();
      gain.gain.value = 2.5;
      source.connect(gain);
      gain.connect(ctx.destination);
      ctx.resume();
    } catch { }
  }
}
