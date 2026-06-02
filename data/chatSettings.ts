export const CHAT_SETTINGS_STORAGE_KEY = "aitc-chatbot-chat-settings-v1";

export type StoredChatSettings = {
  company?: string;
  period?: string;
  periodYear?: string;
  periodQuarter?: string;
  statementType?: string;
  useExpertKnowledge?: boolean;
  useWarehouseData?: boolean;
  useExternalData?: boolean;
};
