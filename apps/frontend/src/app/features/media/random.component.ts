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

const MAX_RETRIES = 3;

@Component({
  selector: 'app-random-media',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './random.component.html',
})
export class RandomMediaComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private el = inject(ElementRef);
  private retries = 0;

  media = signal<MediaResponse | null>(null);
  error = signal<string | null>(null);
  loading = signal(true);
  needsTap = signal(false);

  private clickHandler = () => this.activateSound();

  ngOnInit() {
    this.loadRandom();
  }

  ngOnDestroy() {
    document.removeEventListener('click', this.clickHandler);
    document.removeEventListener('touchstart', this.clickHandler);
  }

  loadRandom() {
    this.loading.set(true);
    this.error.set(null);
    this.media.set(null);
    this.needsTap.set(false);

    const url = `${environment.apiUrl}/api/media/random?_t=${Date.now()}`;
    this.http.get<MediaResponse>(url).subscribe({
      next: (m) => {
        this.media.set(m);
        this.loading.set(false);
        if (m.type === 'video') {
          this.needsTap.set(true);
          document.addEventListener('click', this.clickHandler, { once: true });
          document.addEventListener('touchstart', this.clickHandler, { once: true });
        }
      },
      error: () => {
        if (this.retries < MAX_RETRIES) {
          this.retries++;
          setTimeout(() => this.loadRandom(), 800);
        } else {
          this.error.set('Média introuvable');
          this.loading.set(false);
        }
      },
    });
  }

  // Appelé si l'image ou la vidéo échoue à se charger (erreur proxy/réseau)
  onMediaError() {
    if (this.retries < MAX_RETRIES) {
      this.retries++;
      setTimeout(() => this.loadRandom(), 500);
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
