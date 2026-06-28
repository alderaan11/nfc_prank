import { NextRequest, NextResponse } from "next/server";
import pollData from "../../../../data/poll.json";
import { addVote, getResults, getVoteCount } from "../../../../lib/poll-store";
import { corsHeaders } from "../../../../lib/cors";

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const body = await req.json();
  const { choices } = body;

  if (!Array.isArray(choices) || choices.length !== 3) {
    return NextResponse.json(
      { error: "3 choices required" },
      { status: 400, headers: corsHeaders(origin) }
    );
  }

  const validGames = new Set(pollData.games);
  if (!choices.every((c) => typeof c === "string" && validGames.has(c))) {
    return NextResponse.json(
      { error: "Invalid game choice" },
      { status: 400, headers: corsHeaders(origin) }
    );
  }

  if (new Set(choices).size !== 3) {
    return NextResponse.json(
      { error: "Choices must be distinct" },
      { status: 400, headers: corsHeaders(origin) }
    );
  }

  await addVote({ choices: choices as [string, string, string] });

  const [results, totalVotes] = await Promise.all([
    getResults(pollData.games),
    getVoteCount(),
  ]);

  return NextResponse.json({ results, totalVotes }, { headers: corsHeaders(origin) });
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}
