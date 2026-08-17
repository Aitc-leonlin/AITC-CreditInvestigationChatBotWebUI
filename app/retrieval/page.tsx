import { ChatWindow } from "@/components/ChatWindow";
import { GuideInfoBox } from "@/components/guide/GuideInfoBox";
import { BACKEND_API_PATHS } from "@/utils/api";

export default function AgentsPage() {
  const InfoCard = (
    <GuideInfoBox>
      {/* TEMPORARY: 對應後端路由尚未實作，此紅色標題為權宜標示，完成後移除。 */}
      <h1 className="mb-4 text-xl font-semibold text-rose-700">Retrieval 範例(尚未完成)</h1>
      <ul>
        <li className="hidden text-l md:block">
          🔗
          <span className="ml-2">
            This template showcases how to perform retrieval with a{" "}
            <a href="https://js.langchain.com/" target="_blank">
              LangChain.js
            </a>{" "}
            chain and the Vercel{" "}
            <a href="https://sdk.vercel.ai/docs" target="_blank">
              AI SDK
            </a>{" "}
            in a{" "}
            <a href="https://nextjs.org/" target="_blank">
              Next.js
            </a>{" "}
            project.
          </span>
        </li>
        <li className="hidden text-l md:block">
          🪜
          <span className="ml-2">The chain works in two steps:</span>
          <ul>
            <li className="ml-4">
              1️⃣
              <span className="ml-2">
                First, it rephrases the input question into a
                &quot;standalone&quot; question, dereferencing pronouns based on
                the chat history.
              </span>
            </li>
            <li className="ml-4">
              2️⃣
              <span className="ml-2">
                Then, it queries the retriever for documents similar to the
                dereferenced question and composes an answer.
              </span>
            </li>
          </ul>
        </li>
        <li className="hidden text-l md:block">
          💻
          <span className="ml-2">
            This use-case calls the external backend endpoint configured in{" "}
            <code>utils/api.ts</code>.
          </span>
        </li>
        <li>
          🐶
          <span className="ml-2">
            By default, the agent is pretending to be a talking puppy, but you
            can change the prompt to whatever you want!
          </span>
        </li>
        <li className="text-l">
          🎨
          <span className="ml-2">
            The main frontend logic is found in{" "}
            <code>app/retrieval/page.tsx</code>.
          </span>
        </li>
        <li className="hidden text-l md:block">
          🔱
          <span className="ml-2">
            Before running this example on your own, you&apos;ll first need to
            set up a Supabase vector store. See the README for more details.
          </span>
        </li>
        <li className="text-l">
          👇
          <span className="ml-2">
            Upload some text, then try asking e.g.{" "}
            <code>What is a document loader?</code> below!
          </span>
        </li>
      </ul>
    </GuideInfoBox>
  );
  return (
    <ChatWindow
      endpoint={BACKEND_API_PATHS.chatRetrieval}
      emptyStateComponent={InfoCard}
      showIngestForm={true}
      placeholder={
        'I\'ve got a nose for finding the right documents! Ask, "What is a document loader?"'
      }
      emoji="🐶"
    />
  );
}
