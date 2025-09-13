import { auth } from "@/lib/auth";
import { VideoSummaryDao } from "@/modules/video/data/video-summary.dao";
import { InngestStatusService } from "@/modules/video/services/inngest-status.service";
import { headers } from "next/headers";
import { NextRequest } from "next/server";

interface RouteContext {
  params: Promise<{ eventId: string }>;
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

    const { eventId } = await context.params;

    // Basic eventId validation
    if (!eventId || typeof eventId !== 'string' || eventId.trim() === '') {
      return new Response("Invalid Event ID", { status: 400 });
    }

    // Verify user owns this video by checking if eventId exists in their videos
    const summary = await VideoSummaryDao.findByEventId(eventId);
    if (!summary || summary.userId !== session.user.id) {
      return new Response("Not Found", { status: 404 });
    }

    // Create SSE response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        let lastStatus: string | null = null;
        let interval: NodeJS.Timeout | null = null;
        let isClosed = false;

        const cleanup = () => {
          if (interval) {
            clearInterval(interval);
            interval = null;
          }
          if (!isClosed) {
            isClosed = true;
            try {
              controller.close();
            } catch {
              // Controller might already be closed
            }
          }
        };

        const sendUpdate = async () => {
          if (isClosed) return;
          
          try {
            const status = await InngestStatusService.getUserFriendlyStatus(eventId);
            
            // Only send if status changed to reduce noise
            const statusKey = `${status.status}-${status.currentStep}-${status.progress}`;
            if (statusKey !== lastStatus && !isClosed) {
              const data = `data: ${JSON.stringify(status)}\n\n`;
              try {
                controller.enqueue(encoder.encode(data));
                lastStatus = statusKey;
              } catch {
                // Controller closed during enqueue
                cleanup();
                return;
              }
              
              // Stop polling if processing is complete
              if (status.status === 'completed' || status.status === 'failed') {
                if (!isClosed) {
                  // Send a final close message
                  const closeData = `data: ${JSON.stringify({ ...status, _close: true })}\n\n`;
                  try {
                    controller.enqueue(encoder.encode(closeData));
                  } catch {
                    // Controller closed during enqueue
                  }
                }
                cleanup();
              }
            }
          } catch (error) {
            if (!isClosed) {
              // Check if this is a Jest environment teardown error
              const errorMessage = error instanceof Error ? error.message : String(error);
              if (errorMessage.includes('import') && errorMessage.includes('Jest environment')) {
                // Jest environment has been torn down, just cleanup silently
                cleanup();
                return;
              }
              
              console.error("Error in Inngest SSE polling:", error);
              const errorData = `data: ${JSON.stringify({ 
                status: 'failed', 
                currentStep: 'Error', 
                progress: 0,
                warnings: ['Connection error'],
                completedSteps: []
              })}\n\n`;
              try {
                controller.enqueue(encoder.encode(errorData));
              } catch {
                // Controller closed during enqueue
              }
            }
            cleanup();
          }
        };

        // Send initial status
        sendUpdate();

        // Poll for updates every 1 second (faster than the previous 2s polling)
        interval = setInterval(sendUpdate, 1000);

        // Clean up on client disconnect
        request.signal.addEventListener('abort', cleanup);
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
    console.error("Error in Inngest SSE endpoint:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}