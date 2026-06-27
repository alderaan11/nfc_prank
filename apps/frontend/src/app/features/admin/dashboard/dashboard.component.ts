import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { VideoService } from '../../../core/services/video.service';
import { AuthService } from '../../../core/services/auth.service';
import { Video } from '../../../core/models/video.model';
import { VideoCardComponent } from '../../../shared/components/video-card/video-card.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, VideoCardComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  videos = signal<Video[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  constructor(private videoService: VideoService, public auth: AuthService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.videoService.list().subscribe({
      next: (v) => {
        this.videos.set(v);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger les vidéos');
        this.loading.set(false);
      },
    });
  }

  onDelete(id: string) {
    this.videoService.delete(id).subscribe({
      next: () => this.videos.update((v) => v.filter((x) => x.id !== id)),
      error: () => this.error.set('Erreur lors de la suppression'),
    });
  }

  copyLink(id: string) {
    const url = this.videoService.getShareUrl(id);
    navigator.clipboard.writeText(url);
  }
}
