import type { UIMessage } from "ai";

export type ChatMessageMetadata = {
  finishReason?: string;
};

export type ChatUiMessage = UIMessage<ChatMessageMetadata>;
