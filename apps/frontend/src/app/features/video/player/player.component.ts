import { Component, OnInit, signal, Input, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VideoService } from '../../../core/services/video.service';
import { VideoDetail } from '../../../core/models/video.model';

@Component({
  selector: 'app-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player.component.html',
})
export class PlayerComponent implements OnInit, AfterViewInit {
  @Input() id!: string;
  @ViewChild('videoEl') videoEl!: ElementRef<HTMLVideoElement>;

  video = signal<VideoDetail | null>(null);
  error = signal<string | null>(null);
  loading = signal(true);
  needsTap = signal(false);

  constructor(private videoService: VideoService) {}

  ngOnInit() {
    this.videoService.getById(this.id).subscribe({
      next: (v) => {
        this.video.set(v);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Vidéo introuvable');
        this.loading.set(false);
      },
    });
  }

  ngAfterViewInit() {}

  onVideoReady() {
    const vid = this.videoEl?.nativeElement;
    if (!vid) return;
    vid.volume = 1;
    vid.muted = false;
    vid.play().catch(() => {
      // Autoplay avec son bloqué — on joue muet d'abord
      vid.muted = true;
      vid.play().then(() => {
        // Joue muet, on attend un tap pour activer le son
        this.needsTap.set(true);
      }).catch(() => {
        this.needsTap.set(true);
      });
    });
  }

  activateSound() {
    const vid = this.videoEl?.nativeElement;
    if (!vid) return;
    vid.muted = false;
    vid.volume = 1;
    if (vid.paused) vid.play();
    this.needsTap.set(false);
  }
}
