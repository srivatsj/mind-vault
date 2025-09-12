import { VideoSummaryView } from "@/modules/video/ui/views/VideoSummaryView";

interface PageProps {
  params: Promise<{ id: string }>;
}

const SummaryPage = async ({ params }: PageProps) => {
  const { id } = await params;

  return <VideoSummaryView summaryId={id} />;
};

export default SummaryPage;