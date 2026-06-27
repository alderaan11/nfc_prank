import { NextRequest, NextResponse } from "next/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { db } from "@/lib/db";
import { deleteVideo } from "@/lib/blob";
import { getVideoUrl } from "@/lib/blob";
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

  server.tool("list_videos", "List all uploaded videos", {}, async () => {
    const videos = await db.video.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, filename: true, size: true, createdAt: true },
    });
    return { content: [{ type: "text", text: JSON.stringify(videos, null, 2) }] };
  });

  server.tool(
    "get_video",
    "Get metadata and streaming URL for a video by ID",
    { id: z.string().describe("Video ID") },
    async ({ id }) => {
      const video = await db.video.findUnique({ where: { id } });
      if (!video) {
        return { content: [{ type: "text", text: `Video ${id} not found` }], isError: true };
      }
      const url = await getVideoUrl(video.blobKey);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ ...video, url }, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "delete_video",
    "Delete a video by ID",
    { id: z.string().describe("Video ID") },
    async ({ id }) => {
      const video = await db.video.findUnique({ where: { id } });
      if (!video) {
        return { content: [{ type: "text", text: `Video ${id} not found` }], isError: true };
      }
      await deleteVideo(video.blobKey);
      await db.video.delete({ where: { id } });
      return { content: [{ type: "text", text: `Video ${id} deleted` }] };
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

  return new NextResponse(readable, {
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET() {
  return NextResponse.json({
    name: "nfc-prank-mcp",
    version: "1.0.0",
    tools: ["list_videos", "get_video", "delete_video"],
    transport: "streamable-http",
  });
}
