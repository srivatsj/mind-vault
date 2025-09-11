import { VideoProcessingView } from "@/modules/video/ui/views/VideoProcessingView";

interface PageProps {
  params: Promise<{ id: string }>;
}

const Page = async ({ params }: PageProps) => {
  const { id } = await params;

  return <VideoProcessingView summaryId={id} />;
};

export default Page;