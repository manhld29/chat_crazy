import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChatArea } from "../ChatArea";
import { Conversation, Message, Personality } from "@/lib/api";

describe("ChatArea Component", () => {
  const mockConversation: Conversation = {
    id: "conv-1",
    title: "Cuộc trò chuyện thử nghiệm",
    personality_code: "friendly",
    ai_nickname: "Trợ lý AI",
    summary: null,
    summary_version: 1,
    last_message_at: "2026-08-21T09:00:00Z",
    is_archived: false,
    created_at: "2026-08-21T09:00:00Z",
    updated_at: "2026-08-21T09:00:00Z",
  };

  const mockPersonalities: Personality[] = [
    {
      id: "p1",
      code: "friendly",
      name: "Thân thiện",
      description: "Trò chuyện ấm áp, gần gũi",
      default_temperature: 0.7,
      default_max_output_tokens: 1024,
      is_system: true,
      created_at: "2026-08-21T09:00:00Z",
      updated_at: "2026-08-21T09:00:00Z",
    },
    {
      id: "p2",
      code: "expert",
      name: "Chuyên gia",
      description: "Phân tích logic, sâu sắc",
      default_temperature: 0.3,
      default_max_output_tokens: 2048,
      is_system: true,
      created_at: "2026-08-21T09:00:00Z",
      updated_at: "2026-08-21T09:00:00Z",
    },
  ];

  const mockMessages: Message[] = [
    {
      id: "msg-1",
      conversation_id: "conv-1",
      role: "user",
      content: "Xin chào AI!",
      status: "completed",
      model: null,
      input_tokens: 10,
      output_tokens: 0,
      latency_ms: null,
      error_code: null,
      parent_message_id: null,
      created_at: "2026-08-21T09:00:00Z",
      updated_at: "2026-08-21T09:00:00Z",
    },
    {
      id: "msg-2",
      conversation_id: "conv-1",
      role: "assistant",
      content: "Chào bạn! Tôi có thể giúp gì cho bạn hôm nay?",
      status: "completed",
      model: "openrouter/meta-llama/llama-3.3-70b-instruct:free",
      input_tokens: 15,
      output_tokens: 25,
      latency_ms: 320,
      error_code: null,
      parent_message_id: "msg-1",
      created_at: "2026-08-21T09:00:01Z",
      updated_at: "2026-08-21T09:00:01Z",
    },
  ];

  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("renders empty state with greeting and prompt chips when messages is empty", () => {
    const setInputContent = vi.fn();
    const onSendMessage = vi.fn();

    render(
      <ChatArea
        activeConversation={mockConversation}
        personalities={mockPersonalities}
        messages={[]}
        inputContent=""
        setInputContent={setInputContent}
        isStreaming={false}
        streamError={null}
        onSendMessage={onSendMessage}
        currentBackground="mint"
        onChangeBackground={vi.fn()}
        onChangePersonality={vi.fn()}
        onChangeAiNickname={vi.fn()}
      />,
    );

    expect(screen.getAllByText(/Trợ lý AI/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Cuộc trò chuyện thử nghiệm/i)).toBeInTheDocument();
    expect(screen.getByText(/Bắt đầu bằng một gợi ý/i)).toBeInTheDocument();
  });

  it("renders messages list with user message and AI response", () => {
    render(
      <ChatArea
        activeConversation={mockConversation}
        personalities={mockPersonalities}
        messages={mockMessages}
        inputContent=""
        setInputContent={vi.fn()}
        isStreaming={false}
        streamError={null}
        onSendMessage={vi.fn()}
        currentBackground="mint"
        onChangeBackground={vi.fn()}
        onChangePersonality={vi.fn()}
        onChangeAiNickname={vi.fn()}
      />,
    );

    expect(screen.getByText("Xin chào AI!")).toBeInTheDocument();
    expect(screen.getByText("Chào bạn! Tôi có thể giúp gì cho bạn hôm nay?")).toBeInTheDocument();
    expect(screen.getByText(/320ms/)).toBeInTheDocument();
  });

  it("triggers onSendMessage when Enter key is pressed without Shift", () => {
    const onSendMessage = vi.fn();
    const setInputContent = vi.fn();

    render(
      <ChatArea
        activeConversation={mockConversation}
        personalities={mockPersonalities}
        messages={mockMessages}
        inputContent="Hỏi thêm câu nữa"
        setInputContent={setInputContent}
        isStreaming={false}
        streamError={null}
        onSendMessage={onSendMessage}
        currentBackground="mint"
        onChangeBackground={vi.fn()}
        onChangePersonality={vi.fn()}
        onChangeAiNickname={vi.fn()}
      />,
    );

    const textarea = screen.getByPlaceholderText(/Nhập nội dung tin nhắn/i);
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    expect(onSendMessage).toHaveBeenCalledTimes(1);
  });

  it("does not trigger onSendMessage when Shift+Enter is pressed", () => {
    const onSendMessage = vi.fn();

    render(
      <ChatArea
        activeConversation={mockConversation}
        personalities={mockPersonalities}
        messages={mockMessages}
        inputContent="Dòng 1"
        setInputContent={vi.fn()}
        isStreaming={false}
        streamError={null}
        onSendMessage={onSendMessage}
        currentBackground="mint"
        onChangeBackground={vi.fn()}
        onChangePersonality={vi.fn()}
        onChangeAiNickname={vi.fn()}
      />,
    );

    const textarea = screen.getByPlaceholderText(/Nhập nội dung tin nhắn/i);
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

    expect(onSendMessage).not.toHaveBeenCalled();
  });

  it("shows streaming thinking state when isStreaming is true", () => {
    render(
      <ChatArea
        activeConversation={mockConversation}
        personalities={mockPersonalities}
        messages={mockMessages}
        inputContent=""
        setInputContent={vi.fn()}
        isStreaming={true}
        streamError={null}
        onSendMessage={vi.fn()}
        currentBackground="mint"
        onChangeBackground={vi.fn()}
        onChangePersonality={vi.fn()}
        onChangeAiNickname={vi.fn()}
      />,
    );

    expect(screen.getByText(/đang suy nghĩ/i)).toBeInTheDocument();
  });
});
