import { Component, OnInit, signal, ElementRef, ViewChild } from '@angular/core';
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
  @ViewChild('videoEl') videoEl!: ElementRef<HTMLVideoElement>;

  media = signal<MediaResponse | null>(null);
  error = signal<string | null>(null);
  loading = signal(true);
  needsTap = signal(false);

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get<MediaResponse>(`${environment.apiUrl}/api/media/random`).subscribe({
      next: (m) => {
        this.media.set(m);
        this.loading.set(false);
        if (m.type === 'video') this.needsTap.set(true);
      },
      error: () => {
        this.error.set('Média introuvable');
        this.loading.set(false);
      },
    });
  }

  activateSound() {
    const vid = this.videoEl?.nativeElement;
    if (!vid) return;

    vid.muted = false;
    vid.volume = 1;
    if (vid.paused) vid.play();
    this.needsTap.set(false);

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
