import { Component, OnInit, signal, Input } from '@angular/core';
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

  video = signal<VideoDetail | null>(null);
  error = signal<string | null>(null);
  loading = signal(true);

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
}
