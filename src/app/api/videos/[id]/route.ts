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

    // Basic id validation
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return new Response("Invalid Video ID", { status: 400 });
    }

    // Verify user owns this video summary
    const summary = await VideoSummaryDao.findById(id, session.user.id);
    if (!summary) {
      return new Response("Not Found", { status: 404 });
    }

    return Response.json(summary);

  } catch (error) {
    console.error("Error in video API endpoint:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}