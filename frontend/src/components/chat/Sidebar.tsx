import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faCog, faPen } from '@fortawesome/free-solid-svg-icons'; // faPen 아이콘 추가
import SettingsModal from "./SettingsModal";
import { formatDate } from "../../utils/DateFormatter";
import { Chat } from "../../types/chat";

type SidebarProps = {
  onChatSelected: (chatId: string | null) => void;
  selectedChatId: string | null;
  isOpen: boolean; // Add isOpen prop
  onClose: () => void; // Add onClose prop
};

export const Sidebar: React.FC<SidebarProps> = ({ onChatSelected, selectedChatId, isOpen, onClose }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Fetch chats when the selectedChatId changes
  useEffect(() => {
    fetchChats();
  }, [selectedChatId]);

  const fetchChats = () => {
    fetch(`${process.env.REACT_APP_API_BASE_URL}/chats/`)
      .then((response) => response.json())
      .then((data) => {
        const sortedChats = sortChats(data.chats);
        setChats(sortedChats);
      });
  };

  const sortChats = (chats: Chat[]) => {
    return chats.sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);

      // sort in descending order
      return dateB.getTime() - dateA.getTime();
    });
  };

  const createChat = () => {
    fetch(`${process.env.REACT_APP_API_BASE_URL}/chats/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Chat' }) // Adjust this as necessary.
    })
      .then((response) => response.json())
      .then((newChat) => {
        setChats((prevChats) => [...prevChats, newChat]);
        onChatSelected(newChat.id); // Select the new chat automatically
        if (window.innerWidth <= 768) {
          onClose(); // Close sidebar after creating a new chat only if the screen width is less than or equal to 768px
        }
      });
  };

  const onDeleteChat = (chatId: string) => {
    fetch(`${process.env.REACT_APP_API_BASE_URL}/chats/${chatId}/`, {
      method: 'DELETE'
    })
      .then(() => {
        // Update the state to remove the deleted chat
        setChats((prevChats) => prevChats.filter((chat) => chat.id !== chatId));
        // If the deleted chat was the currently selected one, nullify the selection
        if (chatId === selectedChatId) {
          onChatSelected(null);
        }
      })
      .catch((error) => {
        console.error('Error:', error);
      });
  };

  const handleSettingsClick = () => {
    setShowSettingsModal(true);
  };

  const handleChatClick = (chatId: string) => {
    onChatSelected(chatId);
    if (window.innerWidth <= 768) {
      onClose(); // Close the sidebar only if the screen width is less than or equal to 768px
    }
  };

  return (
    <StyledSidebar isOpen={isOpen} onClick={(e) => e.stopPropagation()}>
      <SidebarHeader>
        <StyledNewChatButton onClick={createChat}>
          <FontAwesomeIcon icon={faPen} title="새 채팅"/>
        </StyledNewChatButton>
      </SidebarHeader>
      <ChatListContainer>
        {chats.map((chat) => (
          <ChatRow
            key={chat.id}
            onClick={() => handleChatClick(chat.id)}
            isSelected={chat.id === selectedChatId}
          >
            <span>{formatDate(chat.created_at)}</span>
            <StyledTrashIcon
              icon={faTrash}
              onClick={(e) => {
                e.stopPropagation(); // Prevent the chat row's onClick event from firing.
                onDeleteChat(chat.id);
              }}
              title="삭제"/>
          </ChatRow>
        ))}
      </ChatListContainer>
      <SettingsRow onClick={handleSettingsClick}>
        <StyledCogIcon icon={faCog} style={{ marginRight: '8px' } } /> API KEY 설정
      </SettingsRow>
      {showSettingsModal && (
        <SettingsModal setShowSettingsModal={setShowSettingsModal} />
      )}
    </StyledSidebar>
  );
};

const SidebarHeader = styled.div`
  padding: 10px;
  background-color: #a33b39;
  display: flex;
  justify-content: flex-end;
  align-items: center;
`;

const StyledNewChatButton = styled.button`
  padding: 10px;
  border: none;
  background-color: transparent;
  color: #f4f4f4; // Change icon color to light gray
  cursor: pointer;
  font-size: 1.5em; // Match the size of new chat icon
  display: flex;
  align-items: center;

  &:hover {
    color: #fff;
  }
`;

const ChatListContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden; // Remove horizontal scroll
`;

const ChatRow = styled.div<{ isSelected?: boolean }>`
  padding: 20px;
  cursor: pointer;
  background-color: ${(props) => (props.isSelected ? '#cd7270' : 'transparent')};
  &:hover {
    background-color: #cd7270;
  }
  color: white;
  font-size: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center; // ensure text and icon are aligned
  overflow: hidden; // add overflow handling

  & > span { // add a span tag around the text inside ChatRow
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-right: 10px;
  }
`;

const StyledTrashIcon = styled(FontAwesomeIcon)`
  color: #f4f4f4; // Change icon color to light gray
  font-size: 1.5em; // Match the size of new chat icon
`;

const StyledCogIcon = styled(FontAwesomeIcon)`
  color: #f4f4f4; // Change icon color to light gray
  font-size: 1.5em; // Match the size of new chat icon
`;

const SettingsRow = styled.div`
  padding-bottom: 20px;
  padding-top: 20px;
  cursor: pointer;
  background-color: #a33b39; // Set the background color to match the sidebar
  &:hover {
    background-color: #cd7270;
  }
  color: #f4f4f4; // Change icon color to light gray
  font-size: 14px;
  display: flex;
  justify-content: center;
  align-items: center;
  position: fixed;
  bottom: 0;
  width: 250px; // Ensure the width matches the sidebar's width
`;

const StyledSidebar = styled.div<{ isOpen: boolean }>`
  width: 250px;
  background: #a33b39; // Set the background color to match the original
  height: 100vh;
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease-in-out;
  transform: ${({ isOpen }) => (isOpen ? 'translateX(0)' : 'translateX(-100%)')};

  @media (max-width: 768px) {
    position: fixed;
    top: 0;
    left: 0;
    height: 100%;
    z-index: 1000;
  }
`;

export default Sidebar;
