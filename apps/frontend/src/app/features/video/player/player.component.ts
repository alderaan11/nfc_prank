import { Component, OnInit, signal, Input, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VideoService } from '../../../core/services/video.service';
import { VideoDetail } from '../../../core/models/video.model';

@Component({
  selector: 'app-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player.component.html',
})
export class PlayerComponent implements OnInit {
  @Input() id!: string;
  @ViewChild('videoEl') videoEl!: ElementRef<HTMLVideoElement>;

  video = signal<VideoDetail | null>(null);
  error = signal<string | null>(null);
  loading = signal(true);
  // L'overlay est toujours visible jusqu'au premier tap (iOS + Android)
  needsTap = signal(false);

  constructor(private videoService: VideoService) {}

  ngOnInit() {
    this.videoService.getById(this.id).subscribe({
      next: (v) => {
        this.video.set(v);
        this.loading.set(false);
        this.needsTap.set(true);
      },
      error: () => {
        this.error.set('Vidéo introuvable');
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
  }
}
