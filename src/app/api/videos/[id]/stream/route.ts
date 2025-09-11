import { auth } from "@/lib/auth";
import { VideoSummaryDao } from "@/modules/video/data/video-summary.dao";
import { headers } from "next/headers";
import { NextRequest } from "next/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { id } = await context.params;

    // Verify user owns this video summary
    const summary = await VideoSummaryDao.findById(id, session.user.id);
    if (!summary) {
      return new Response("Not Found", { status: 404 });
    }

    // Create SSE response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Send initial data
        const data = `data: ${JSON.stringify(summary)}\n\n`;
        controller.enqueue(encoder.encode(data));

        // Set up polling for status changes (only server-side)
        const interval = setInterval(async () => {
          try {
            const updatedSummary = await VideoSummaryDao.findById(id, session.user.id);
            if (updatedSummary) {
              const data = `data: ${JSON.stringify(updatedSummary)}\n\n`;
              controller.enqueue(encoder.encode(data));
              
              // Stop polling if processing is complete
              if (updatedSummary.processingStatus === "completed" || 
                  updatedSummary.processingStatus === "failed") {
                clearInterval(interval);
              }
            }
          } catch (error) {
            console.error("Error in SSE polling:", error);
            clearInterval(interval);
            controller.close();
          }
        }, 2000);

        // Clean up on client disconnect
        request.signal.addEventListener('abort', () => {
          clearInterval(interval);
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    });

  } catch (error) {
    console.error("Error in SSE endpoint:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}