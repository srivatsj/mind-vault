"use client";

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useEffect, useState } from "react";

interface BlockNoteEditorProps {
  content: string;
  onChange: (content: string) => void;
  className?: string;
}

export const BlockNoteEditor = ({
  content,
  onChange,
  className = ""
}: BlockNoteEditorProps) => {
  const [isInitialized, setIsInitialized] = useState(false);

  const editor = useCreateBlockNote();

  // Initialize content from markdown
  useEffect(() => {
    if (content && content.trim() && !isInitialized) {
      editor.tryParseMarkdownToBlocks(content).then((blocks) => {
        editor.replaceBlocks(editor.document, blocks);
        setIsInitialized(true);
      });
    }
  }, [content, isInitialized, editor]);

  const handleChange = async () => {
    const markdown = await editor.blocksToMarkdownLossy(editor.document);
    // Debounce the onChange to prevent cursor jumping during typing
    setTimeout(() => {
      onChange(markdown);
    }, 0);
  };

  return (
    <BlockNoteView
      editor={editor}
      onChange={handleChange}
      theme="light"
      className={className}
    />
  );
};

