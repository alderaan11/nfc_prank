export interface GameResult {
  game: string;
  points: number;
}

export interface PollData {
  title: string;
  games: string[];
  results: GameResult[];
  totalVotes: number;
}

export interface VoteResponse {
  results: GameResult[];
  totalVotes: number;
}
