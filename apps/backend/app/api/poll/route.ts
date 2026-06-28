import { NextRequest, NextResponse } from "next/server";
import pollData from "../../../data/poll.json";
import { getResults, getVoteCount } from "../../../lib/poll-store";
import { corsHeaders } from "../../../lib/cors";

export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin");
  const [results, totalVotes] = await Promise.all([
    getResults(pollData.games),
    getVoteCount(),
  ]);
  return NextResponse.json(
    { title: pollData.title, games: pollData.games, results, totalVotes },
    { headers: corsHeaders(origin) }
  );
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}
