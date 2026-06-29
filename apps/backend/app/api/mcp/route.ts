import { NextRequest, NextResponse } from "next/server";
import { listVideos, getVideo } from "@/lib/videos-store";

const TOOLS = [
  {
    name: "list_videos",
    description: "List all videos from videos.json",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_video",
    description: "Get a video by ID",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Video ID" } },
      required: ["id"],
    },
  },
];

function requireMcpToken(req: NextRequest): boolean {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  return token === process.env.MCP_SECRET_TOKEN;
}

function jsonrpc(id: unknown, result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id, result });
}

function jsonrpcError(id: unknown, code: number, message: string) {
  return NextResponse.json({ jsonrpc: "2.0", id, error: { code, message } });
}

export async function GET(req: NextRequest) {
  if (!requireMcpToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    name: "nfc-prank-mcp",
    version: "1.0.0",
    tools: TOOLS.map((t) => t.name),
    transport: "http",
  });
}

export async function POST(req: NextRequest) {
  if (!requireMcpToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || body.jsonrpc !== "2.0") {
    return jsonrpcError(null, -32600, "Invalid Request");
  }

  const { id, method, params } = body;

  if (method === "initialize") {
    return jsonrpc(id, {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "nfc-prank-mcp", version: "1.0.0" },
    });
  }

  if (method === "tools/list") {
    return jsonrpc(id, { tools: TOOLS });
  }

  if (method === "tools/call") {
    const { name, arguments: args = {} } = params ?? {};

    if (name === "list_videos") {
      const videos = listVideos();
      return jsonrpc(id, {
        content: [{ type: "text", text: JSON.stringify(videos, null, 2) }],
      });
    }

    if (name === "get_video") {
      const video = getVideo(args.id);
      if (!video) {
        return jsonrpc(id, {
          content: [{ type: "text", text: `Video ${args.id} not found` }],
          isError: true,
        });
      }
      return jsonrpc(id, {
        content: [{ type: "text", text: JSON.stringify({ id: args.id, ...video }, null, 2) }],
      });
    }

    return jsonrpcError(id, -32602, `Unknown tool: ${name}`);
  }

  return jsonrpcError(id, -32601, "Method not found");
}
