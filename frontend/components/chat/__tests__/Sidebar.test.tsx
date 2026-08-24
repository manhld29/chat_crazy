import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Sidebar } from "../Sidebar";
import { Conversation, UserPublic } from "@/lib/api";

describe("Sidebar Component", () => {
  const mockUser: UserPublic = {
    id: "u1",
    email: "user@test.com",
    username: "testuser",
    display_name: "Anh Sếp",
    is_guest: false,
    is_active: true,
    is_admin: false,
    created_at: "2026-08-21T09:00:00Z",
    updated_at: "2026-08-21T09:00:00Z",
    last_login_at: "2026-08-21T09:00:00Z",
  };

  const mockConversations: Conversation[] = [
    {
      id: "c1",
      title: "Học React và Next.js",
      personality_code: "friendly",
      ai_nickname: null,
      summary: null,
      summary_version: 1,
      last_message_at: "2026-08-21T09:00:00Z",
      is_archived: false,
      created_at: "2026-08-21T09:00:00Z",
      updated_at: "2026-08-21T09:00:00Z",
    },
    {
      id: "c2",
      title: "Tìm kiếm công thức nấu ăn",
      personality_code: "humorous",
      ai_nickname: null,
      summary: null,
      summary_version: 1,
      last_message_at: "2026-08-20T09:00:00Z",
      is_archived: false,
      created_at: "2026-08-20T09:00:00Z",
      updated_at: "2026-08-20T09:00:00Z",
    },
  ];

  it("renders user information and conversation list", () => {
    render(
      <Sidebar
        user={mockUser}
        currentView="chat"
        onSelectView={vi.fn()}
        conversations={mockConversations}
        activeConvId="c1"
        onSelectConversation={vi.fn()}
        onCreateConversation={vi.fn()}
        showArchived={false}
        onToggleShowArchived={vi.fn()}
        onArchive={vi.fn()}
        onUnarchive={vi.fn()}
        onDelete={vi.fn()}
        onRename={vi.fn()}
        onLogout={vi.fn()}
        onOpenUpgrade={vi.fn()}
      />,
    );

    expect(screen.getByText("Anh Sếp")).toBeInTheDocument();
    expect(screen.getByText("Học React và Next.js")).toBeInTheDocument();
    expect(screen.getByText("Tìm kiếm công thức nấu ăn")).toBeInTheDocument();
  });

  it("filters conversation list when typing in search bar", () => {
    render(
      <Sidebar
        user={mockUser}
        currentView="chat"
        onSelectView={vi.fn()}
        conversations={mockConversations}
        activeConvId="c1"
        onSelectConversation={vi.fn()}
        onCreateConversation={vi.fn()}
        showArchived={false}
        onToggleShowArchived={vi.fn()}
        onArchive={vi.fn()}
        onUnarchive={vi.fn()}
        onDelete={vi.fn()}
        onRename={vi.fn()}
        onLogout={vi.fn()}
        onOpenUpgrade={vi.fn()}
      />,
    );

    const searchInput = screen.getByPlaceholderText(/Tìm kiếm cuộc trò chuyện/i);
    fireEvent.change(searchInput, { target: { value: "nấu ăn" } });

    expect(screen.queryByText("Học React và Next.js")).not.toBeInTheDocument();
    expect(screen.getByText("Tìm kiếm công thức nấu ăn")).toBeInTheDocument();
  });

  it("calls onCreateConversation when Create Conversation button is clicked", () => {
    const onCreate = vi.fn();
    render(
      <Sidebar
        user={mockUser}
        currentView="chat"
        onSelectView={vi.fn()}
        conversations={mockConversations}
        activeConvId="c1"
        onSelectConversation={vi.fn()}
        onCreateConversation={onCreate}
        showArchived={false}
        onToggleShowArchived={vi.fn()}
        onArchive={vi.fn()}
        onUnarchive={vi.fn()}
        onDelete={vi.fn()}
        onRename={vi.fn()}
        onLogout={vi.fn()}
        onOpenUpgrade={vi.fn()}
      />,
    );

    const createBtn = screen.getByRole("button", { name: /tạo cuộc trò chuyện/i });
    fireEvent.click(createBtn);

    expect(onCreate).toHaveBeenCalledTimes(1);
  });
});
