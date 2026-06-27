import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Video } from '../../../core/models/video.model';

@Component({
  selector: 'app-video-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './video-card.component.html',
})
export class VideoCardComponent {
  @Input() video!: Video;
  @Output() delete = new EventEmitter<string>();
  @Output() copyLink = new EventEmitter<string>();

  formatSize(bytes: number): string {
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }
}
