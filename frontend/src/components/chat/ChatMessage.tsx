import React from 'react';
import styled from 'styled-components';

type MessageProps = {
  sender: string;
  content: string;
  isUser: boolean;
};

const Container = styled.div<{ isUser: boolean }>`
  display: flex;
  justify-content: ${({ isUser }) => (isUser ? 'flex-end' : 'flex-start')};
  padding: 10px;
  align-items: flex-start;
`;

const Bubble = styled.div<{ isUser: boolean }>`
  background-color: ${({ isUser }) => (isUser ? '#f4f4f4' : '#cd7270')};
  padding: 10px;
  border-radius: 10px;
  max-width: 60%;
  display: flex;
  flex-direction: column; /* Ensure long messages wrap correctly */
  word-wrap: break-word; /* Ensure long words wrap */
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const Content = styled.div`
  line-height: 1.5;
  font-size: 16px;
  word-break: break-word; /* Ensure long words wrap correctly */
`;

const Sender = styled.div`
  font-weight: 700;
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  min-width: 50px;
  margin-right: 10px;
`;

const IconWrapper = styled.div`
  margin-right: 10px;
  display: flex;
  align-items: center;
`;

const RobotIcon = styled.img`
  width: 30px;
  height: 30px;
`;

export const ChatMessage: React.FC<MessageProps> = ({ sender, content, isUser }) => (
  <Container isUser={isUser}>
    {!isUser && (
      <IconWrapper>
        <RobotIcon src="/kuplace_icon.png" alt="Kuplace Icon" />
      </IconWrapper>
    )}
    <Bubble isUser={isUser}>
      <Content>
        {content.toString().split('\n').map((line, index) => (
          line === '' ? <br key={index} /> : <div key={index}>{line}</div>
        ))}
      </Content>
    </Bubble>
  </Container>
);