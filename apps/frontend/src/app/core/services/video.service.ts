import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { VideoDetail } from '../models/video.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class VideoService {
  constructor(private http: HttpClient) {}

  getById(id: string): Observable<VideoDetail> {
    return this.http.get<VideoDetail>(`${environment.apiUrl}/api/videos/${id}`);
  }
}
