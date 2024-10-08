import React, { useEffect, useRef, useState } from 'react';
import { Sidebar } from './components/chat/Sidebar';
import { ChatBox } from './components/chat/ChatBox';
import { ChatInput } from "./components/chat/ChatInput";
import styled from 'styled-components';
import ReconnectingWebSocket from "reconnecting-websocket";
import { Message } from "./data/Message";
import { ChatMenu } from "./components/chat/debug/ChatMenu";
import { DebugDrawer } from "./components/chat/debug/DebugDrawer";
import { GuidePage } from './components/chat/GuidePage';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars } from '@fortawesome/free-solid-svg-icons';

export const App = () => {
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const webSocket = useRef<ReconnectingWebSocket | null>(null);
  const [loading, setLoading] = useState(false);
  const [debugMessage, setDebugMessage] = useState<string>("");
  const [debugMode, setDebugMode] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    if (currentChatId) {
      webSocket.current = new ReconnectingWebSocket(`wss://kupletalk-4c60f80926c4.herokuapp.com/ws/chat/${currentChatId}/`);
      webSocket.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "debug") {
          const formattedToken = data.message.replace(/\n/g, '<br />');
          setDebugMessage(prevMessage => prevMessage + formattedToken);
        } else {
          setLoading(false);
          const newMessage = { sender: '쿠플봇', content: data['message'] };
          setMessages(prevMessages => [...prevMessages, newMessage]);
        }
      };

      webSocket.current.onclose = () => {
        console.error('Chat socket closed unexpectedly');
      };
      fetchMessages(currentChatId);
    }
    return () => {
      webSocket.current?.close();
    };
  }, [currentChatId]);

  const onChatSelected = (chatId: string | null) => {
    if (currentChatId === chatId) return;
    if (chatId == null) {
      setMessages([]);
    }
    setCurrentChatId(chatId);
  };

  const onNewUserMessage = (chatId: string, message: Message) => {
    webSocket.current?.send(
      JSON.stringify({
        message: message.content,
        chat_id: chatId,
      })
    );
    setMessages(prevMessages => [...prevMessages, message]);
    setLoading(true);
  };

  const onNewChatCreated = (chatId: string) => {
    onChatSelected(chatId);
  };

  const fetchMessages = (currentChatId: string | null) => {
    fetch(`${process.env.REACT_APP_API_BASE_URL}/chats/${currentChatId}/messages/`)
      .then(response => response.json())
      .then(data => {
        setMessages(data);
      });
  };

  const onExampleQuestionClick = (message: string) => {
    if (message.trim() === '') return;

    if (currentChatId) {
      onNewUserMessage(currentChatId, { sender: 'USER', content: message });
    } else {
      createChat(message);
    }
  };

  const createChat = (message: string) => {
    fetch(`${process.env.REACT_APP_API_BASE_URL}/chats/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Chat' })
    })
      .then((response) => response.json())
      .then((newChat) => {
        onNewChatCreated(newChat.id);

        setTimeout(() => {
          onNewUserMessage(newChat.id, { sender: 'USER', content: message });
        }, 500);
      });
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <AppContainer isSidebarOpen={sidebarOpen}>
      <SidebarContainer isOpen={sidebarOpen}>
        <Sidebar onChatSelected={onChatSelected} selectedChatId={currentChatId} isOpen={sidebarOpen} onClose={closeSidebar} />
      </SidebarContainer>
      {sidebarOpen && window.innerWidth <= 768 && <Overlay onClick={closeSidebar} />}
      <ChatContainer debugMode={debugMode} isSidebarOpen={sidebarOpen}>
        <StyledMenuButton onClick={toggleSidebar} title={sidebarOpen ? "사이드바 닫기" : "사이드바 열기"}>
          <FontAwesomeIcon icon={faBars} />
        </StyledMenuButton>
        <ChatMenu debugMode={debugMode} setDebugMode={setDebugMode} />
        {currentChatId ? (
          <ChatBoxContainer>
            <ChatBox messages={messages} isLoading={loading} />
          </ChatBoxContainer>
        ) : (
          <GuidePageContainer>
            <GuidePage onExampleQuestionClick={onExampleQuestionClick} />
          </GuidePageContainer>
        )}
        <ChatInputContainer isSidebarOpen={sidebarOpen}>
          <ChatInput onNewUserMessage={onNewUserMessage} onNewChatCreated={onNewChatCreated} chatId={currentChatId} />
        </ChatInputContainer>
      </ChatContainer>
      {debugMode && <DebugDrawer message={debugMessage} debugMode={debugMode} />}
    </AppContainer>
  );
};

const AppContainer = styled.div<{ isSidebarOpen: boolean }>`
  display: flex;
  height: 100vh;
  overflow: hidden;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const SidebarContainer = styled.div<{ isOpen: boolean }>`
  width: 250px;
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

const Overlay = styled.div`
  @media (max-width: 768px) {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 500;
  }
`;

const ChatContainer = styled.div<{ debugMode: boolean; isSidebarOpen: boolean }>`
  display: flex;
  flex-direction: column;
  flex: 1;
  width: ${({ debugMode }) => (debugMode ? '70%' : '100%')};
  margin-left: ${({ isSidebarOpen }) => (isSidebarOpen ? '0' : '-250px')};
  transition: margin-left 0.3s ease-in-out;
  height: 100%; /* Ensures ChatContainer takes full height */
  position: relative;
  padding-bottom: 100px; /* ChatInput의 높이만큼 여유 공간 추가 */

  @media (max-width: 768px) {
    margin-left: 0;
    width: 100%;
    padding-bottom: 100px; /* ChatInput의 높이만큼 여유 공간 추가 */
  }
`;


const ChatBoxContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  height: 100%; /* Ensures ChatBoxContainer takes full height */
  box-sizing: border-box;
  padding-bottom: 70px;
`;

const GuidePageContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding-bottom: 70px;
  box-sizing: border-box;
`;

const ChatInputContainer = styled.div<{ isSidebarOpen: boolean }>`
  position: fixed;
  bottom: 0;
  
  margin-left: ${({ isSidebarOpen }) => (isSidebarOpen ? '100px' : '200px')};
  width: calc(100% - ${({ isSidebarOpen }) => (isSidebarOpen ? '250px' : '0')});
  background-color: blue;
  z-index: 1000;
  transition: margin-left 0.3s ease-in-out, width 0.3s ease-in-out;

  @media (max-width: 768px) {
    visibility: ${({ isSidebarOpen }) => (isSidebarOpen ? 'hidden' : 'visible')};
    margin-left : 50px;
    width: 100%; /* 모바일 화면에서는 항상 100% 너비 유지 */
  }
`;


const StyledMenuButton = styled.button`
  position: fixed;
  top: 16px;
  left: 10px;
  background: none;
  border: none;
  font-size: 1.5em;
  cursor: pointer;
  z-index: 1100;
  color: #f4f4f4;
  font-size: 1.7em;
`;