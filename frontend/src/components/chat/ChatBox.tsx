import React from 'react';
import styled from 'styled-components';
import TypingIndicator from "./TypingIndicator";
import { ChatMessage } from "./ChatMessage";

type Message = {
  sender: string;
  content: string;
};

type ChatBoxProps = {
  messages: Message[];
  isLoading: boolean;
};

export const ChatBox: React.FC<ChatBoxProps> = ({ messages, isLoading }) => {
  return (
    <StyledChatBox>
      <MessageList>
        {messages.map((message, index) => (
          <ChatMessage key={index} sender={message.sender} content={message.content} isUser={message.sender.toLowerCase() === 'user'} />
        ))}
        {isLoading && <TypingIndicator isTyping={isLoading} />}
      </MessageList>
    </StyledChatBox>
  );
};

const MessageList = styled.div`
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  flex-grow: 1;
`;

const StyledChatBox = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 20px;
  @media (max-width: 768px) {
    padding: 15px;
  }
  @media (max-width: 480px) {
    padding: 10px;
  }
`;