import { ChatWindow } from "@/components/ChatWindow";
import { GuideInfoBox } from "@/components/guide/GuideInfoBox";
import { BACKEND_API_PATHS } from "@/utils/api";

export default function ChatbotPage() {
  const InfoCard = (
    <GuideInfoBox>
      <ul>
        <li className="text-l">
          <span className="ml-2">
            這個聊天視窗已支援多輪上下文追問，可直接延續上一題，例如：
            <code>那跟同業比呢？</code>
          </span>
        </li>
        <li className="hidden text-l md:block">
          <span className="ml-2">
            右上角可建立新對話、複製整段內容，手機版可從
            <code>歷史紀錄</code> 入口切換過去案件。
          </span>
        </li>
        <li>
          <span className="ml-2">
            每則助理回答都可單獨複製，也可複製整段對話。
          </span>
        </li>
        <li className="hidden text-l md:block">
          <span className="ml-2">
            若需正式串接後端歷史紀錄與案件系統，可從
            <code>app/api/chat/sessions</code> 開始接入。
          </span>
        </li>
        <li className="text-l">
          <span className="ml-2">
            可先測試：<code>請分析這家公司授信風險</code>
          </span>
        </li>
      </ul>
    </GuideInfoBox>
  );

  return (
    <ChatWindow
      endpoint={BACKEND_API_PATHS.chat}
      emoji="AI"
      placeholder="請輸入授信調查問題"
      emptyStateComponent={InfoCard}
      presetQuestions={[
        "現金水位是否充足？",
        "是否有短債壓力？",
        "近三期營收與獲利趨勢是否惡化？",
      ]}
    />
  );
}
