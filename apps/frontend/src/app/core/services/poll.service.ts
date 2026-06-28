import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PollData, VoteResponse } from '../models/poll.model';

@Injectable({ providedIn: 'root' })
export class PollService {
  private readonly base = `${environment.apiUrl}/api/poll`;

  constructor(private http: HttpClient) {}

  get(): Observable<PollData> {
    return this.http.get<PollData>(this.base);
  }

  vote(choices: string[]): Observable<VoteResponse> {
    return this.http.post<VoteResponse>(`${this.base}/vote`, { choices });
  }
}
