import type { ChatMessage } from "../../types";

export interface Ask {
  question: ChatMessage;
  answer: ChatMessage | null;
}

/**
 * Pair adjacent (user → assistant) messages into ask/answer rows so the UI
 * can render one card per ask. Orphan assistant messages (defensive — should
 * not happen in a well-formed thread) get a placeholder question.
 */
export function groupAsks(messages: ChatMessage[]): Ask[] {
  const result: Ask[] = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === "user") {
      const next = messages[i + 1];
      const answer = next?.role === "assistant" ? next : null;
      result.push({ question: msg, answer });
      if (answer) i++;
    } else {
      result.push({
        question: { role: "user", text: "(no question)" },
        answer: msg,
      });
    }
  }
  return result;
}
