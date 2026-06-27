import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Video, VideoDetail, UploadResponse } from '../models/video.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class VideoService {
  private base = `${environment.apiUrl}/api/videos`;

  constructor(private http: HttpClient) {}

  list(): Observable<Video[]> {
    return this.http.get<Video[]>(this.base, { withCredentials: true });
  }

  getById(id: string): Observable<VideoDetail> {
    return this.http.get<VideoDetail>(`${this.base}/${id}`);
  }

  upload(title: string, file: File): Observable<UploadResponse> {
    const form = new FormData();
    form.append('title', title);
    form.append('file', file);
    return this.http.post<UploadResponse>(`${this.base}/upload`, form, {
      withCredentials: true,
    });
  }

  delete(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.base}/${id}`, {
      withCredentials: true,
    });
  }

  getShareUrl(id: string): string {
    return `${window.location.origin}/v/${id}`;
  }
}
