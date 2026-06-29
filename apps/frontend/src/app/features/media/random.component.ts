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

  media = signal<MediaResponse | null>(null);
  error = signal<string | null>(null);
  loading = signal(true);
  needsTap = signal(false);

  private clickHandler = () => this.activateSound();

  ngOnInit() {
    this.http.get<MediaResponse>(`${environment.apiUrl}/api/media/random`).subscribe({
      next: (m) => {
        this.media.set(m);
        this.loading.set(false);
        if (m.type === 'video') {
          this.needsTap.set(true);
          // Un seul tap sur n'importe quel endroit de l'écran suffit
          document.addEventListener('click', this.clickHandler, { once: true });
          document.addEventListener('touchstart', this.clickHandler, { once: true });
        }
      },
      error: () => {
        this.error.set('Média introuvable');
        this.loading.set(false);
      },
    });
  }

  ngOnDestroy() {
    document.removeEventListener('click', this.clickHandler);
    document.removeEventListener('touchstart', this.clickHandler);
  }

  private activateSound() {
    this.needsTap.set(false);

    const vid = this.el.nativeElement.querySelector('video') as HTMLVideoElement | null;
    if (!vid) return;

    vid.muted = false;
    vid.volume = 1;
    if (vid.paused) vid.play();

    // Amplifie via Web Audio API (dépasse le volume système sur Android/Chrome)
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
    } catch {
      // iOS Safari fallback silencieux
    }
  }
}
