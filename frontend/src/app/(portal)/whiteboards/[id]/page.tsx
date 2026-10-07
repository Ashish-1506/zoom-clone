import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { WhiteboardEditor } from "@/components/whiteboards/WhiteboardEditor";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Whiteboard | ${APP_NAME}`,
};

export default async function WhiteboardEditorRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const boardId = Number(id);
  if (!Number.isInteger(boardId) || boardId < 1) notFound();
  return <WhiteboardEditor boardId={boardId} />;
}
