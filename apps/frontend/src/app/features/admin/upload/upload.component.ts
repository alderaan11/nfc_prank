import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { VideoService } from '../../../core/services/video.service';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './upload.component.html',
})
export class UploadComponent {
  title = '';
  file: File | null = null;
  dragOver = signal(false);
  uploading = signal(false);
  progress = signal(0);
  error = signal<string | null>(null);
  success = signal<{ id: string; url: string } | null>(null);

  readonly maxSizeMb = 500;

  constructor(private videoService: VideoService, private router: Router) {}

  onDragOver(e: DragEvent) {
    e.preventDefault();
    this.dragOver.set(true);
  }

  onDragLeave() {
    this.dragOver.set(false);
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.dragOver.set(false);
    const f = e.dataTransfer?.files[0];
    if (f) this.setFile(f);
  }

  onFileChange(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) this.setFile(f);
  }

  private setFile(f: File) {
    this.error.set(null);
    if (!f.name.toLowerCase().endsWith('.mp4')) {
      this.error.set('Seuls les fichiers .mp4 sont acceptés');
      return;
    }
    if (f.size > this.maxSizeMb * 1024 * 1024) {
      this.error.set(`Fichier trop volumineux (max ${this.maxSizeMb} MB)`);
      return;
    }
    this.file = f;
  }

  submit() {
    if (!this.file || !this.title.trim()) return;
    this.error.set(null);
    this.uploading.set(true);

    this.videoService.upload(this.title.trim(), this.file).subscribe({
      next: (res) => {
        const url = this.videoService.getShareUrl(res.id);
        this.success.set({ id: res.id, url });
        this.uploading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.error ?? 'Erreur lors de l\'upload');
        this.uploading.set(false);
      },
    });
  }

  copyLink() {
    const s = this.success();
    if (s) navigator.clipboard.writeText(s.url);
  }

  reset() {
    this.title = '';
    this.file = null;
    this.success.set(null);
    this.error.set(null);
  }
}
