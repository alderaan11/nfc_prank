import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PollService } from '../../core/services/poll.service';
import { GameResult } from '../../core/models/poll.model';

const VOTED_KEY = 'poll_voted';

@Component({
  selector: 'app-poll',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './poll.component.html',
})
export class PollComponent implements OnInit {
  title = signal('');
  games = signal<string[]>([]);
  selected = signal<string[]>([]);
  results = signal<GameResult[]>([]);
  totalVotes = signal(0);
  state = signal<'loading' | 'vote' | 'results' | 'error'>('loading');
  submitting = signal(false);
  error = signal<string | null>(null);

  maxPoints = computed(() => this.results()[0]?.points ?? 1);

  constructor(private pollService: PollService) {}

  ngOnInit() {
    if (localStorage.getItem(VOTED_KEY)) {
      this.loadResults();
      return;
    }
    this.pollService.get().subscribe({
      next: (data) => {
        this.title.set(data.title);
        this.games.set(data.games);
        this.state.set('vote');
      },
      error: (err) => {
        this.error.set(`Erreur API: ${err?.status ?? 0} ${err?.message ?? ''}`);
        this.state.set('error');
      },
    });
  }

  loadResults() {
    this.pollService.get().subscribe({
      next: (data) => {
        this.title.set(data.title);
        this.results.set(data.results);
        this.totalVotes.set(data.totalVotes);
        this.state.set('results');
      },
    });
  }

  rankOf(game: string): number {
    return this.selected().indexOf(game) + 1;
  }

  toggle(game: string) {
    const sel = this.selected();
    const idx = sel.indexOf(game);
    if (idx >= 0) {
      this.selected.set(sel.filter((g) => g !== game));
    } else if (sel.length < 3) {
      this.selected.set([...sel, game]);
    }
  }

  submit() {
    if (this.selected().length !== 3 || this.submitting()) return;
    this.submitting.set(true);
    this.error.set(null);
    this.pollService.vote(this.selected()).subscribe({
      next: (res) => {
        localStorage.setItem(VOTED_KEY, '1');
        this.results.set(res.results);
        this.totalVotes.set(res.totalVotes);
        this.state.set('results');
      },
      error: () => {
        this.error.set("Erreur lors de l'envoi du vote.");
        this.submitting.set(false);
      },
    });
  }

  widthOf(result: GameResult): number {
    const max = this.maxPoints();
    return max > 0 ? Math.round((result.points / max) * 100) : 0;
  }
}
