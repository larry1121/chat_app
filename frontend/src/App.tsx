import React, { useEffect, useRef, useState } from 'react';
import { Sidebar } from './components/chat/Sidebar';
import { ChatBox } from './components/chat/ChatBox';
import { ChatInput } from "./components/chat/ChatInput";
import styled from 'styled-components';
import ReconnectingWebSocket from "reconnecting-websocket";
import { Message } from "./data/Message";
import { ChatMenu } from "./components/chat/debug/ChatMenu";
import { DebugDrawer } from "./components/chat/debug/DebugDrawer";
import { GuidePage } from './components/chat/GuidePage'; // GuidePage import
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars } from '@fortawesome/free-solid-svg-icons';

export const App = () => {
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const webSocket = useRef<ReconnectingWebSocket | null>(null);
  const [loading, setLoading] = useState(false);
  const [debugMessage, setDebugMessage] = useState<string>("");
  const [debugMode, setDebugMode] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

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
          const newMessage = {sender: '쿠플봇', content: data['message']};
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
        console.log(data)
      });
  };

  const onExampleQuestionClick = (message: string) => {
    if (message.trim() === '') return;

    const createChat = () => {
      fetch(`${process.env.REACT_APP_API_BASE_URL}/chats/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Chat' }) // Adjust this as necessary.
      })
        .then((response) => response.json())
        .then((newChat) => {
          // Update listeners that a new chat was created.
          onNewChatCreated(newChat.id);

          // Send the message after a timeout to ensure that the Chat has been created
          setTimeout(function () {
            onNewUserMessage(newChat.id, { sender: 'USER', content: message });
          }, 500);
        });
    };

    createChat();
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
        <ChatInputContainer>
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
  transition: all 0.3s ease-in-out;
  height: 100%; /* Ensure it takes up the full height */
  position: relative; /* Ensure children are positioned relative to this container */
`;

const ChatBoxContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  box-sizing: border-box;
  padding-bottom: 70px; /* Space for the ChatInput */
`;

const GuidePageContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  box-sizing: border-box;
  padding-bottom: 70px; /* Space for the ChatInput */
`;

const ChatInputContainer = styled.div`
  position: absolute;
  bottom: 0;
  width: 100%;
  background-color: white;
  padding: 10px;
  box-shadow: 0px -1px 5px rgba(0, 0, 0, 0.2);
  height: 70px; /* Fixed height for ChatInputContainer */
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