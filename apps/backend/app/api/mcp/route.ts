import { NextRequest, NextResponse } from "next/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { listVideos, getVideo } from "@/lib/videos-store";
import { z } from "zod";

function requireMcpToken(req: NextRequest): boolean {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  return token === process.env.MCP_SECRET_TOKEN;
}

function buildServer(): McpServer {
  const server = new McpServer({
    name: "nfc-prank-mcp",
    version: "1.0.0",
  });

  server.tool("list_videos", "List all videos from videos.json", {}, async () => {
    const videos = listVideos();
    return { content: [{ type: "text", text: JSON.stringify(videos, null, 2) }] };
  });

  server.tool(
    "get_video",
    "Get a video by ID",
    { id: z.string().describe("Video ID") },
    async ({ id }) => {
      const video = getVideo(id);
      if (!video) {
        return { content: [{ type: "text", text: `Video ${id} not found` }], isError: true };
      }
      return { content: [{ type: "text", text: JSON.stringify({ id, ...video }, null, 2) }] };
    }
  );

  return server;
}

export async function POST(req: NextRequest) {
  if (!requireMcpToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  const server = buildServer();
  await server.connect(transport);

  const body = await req.json();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  transport.onmessage = async (message) => {
    const chunk = new TextEncoder().encode(JSON.stringify(message) + "\n");
    await writer.write(chunk);
    await writer.close();
  };

  await transport.handleRequest(req, new NextResponse(readable), body);

  return new NextResponse(readable, { headers: { "Content-Type": "application/json" } });
}

export async function GET() {
  return NextResponse.json({
    name: "nfc-prank-mcp",
    version: "1.0.0",
    tools: ["list_videos", "get_video"],
    transport: "streamable-http",
  });
}
