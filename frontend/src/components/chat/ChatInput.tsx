import React, { useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import styled from 'styled-components';
import { Message } from "../../data/Message";
import { FaPaperPlane } from 'react-icons/fa'; // Import the paper plane icon

type ChatInputProps = {
  onNewUserMessage: (chatId: string, message: Message) => void;
  onNewChatCreated: (chatId: string) => void;
  chatId: string | null;
};

export const ChatInput: React.FC<ChatInputProps> = ({ onNewUserMessage, onNewChatCreated, chatId }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (message.trim() === '') return;

    if (chatId) {
      // If there is a chatId, just send the message.
      const newMessage = { sender: 'USER', content: message };
      onNewUserMessage(chatId, newMessage);
    } else {
      // If there is no chatId, create a new chat.
      createChat();
    }
    setMessage(''); // Clear the input message
  }

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
        setTimeout(() => {
          onNewUserMessage(newChat.id, { sender: 'USER', content: message });
        }, 500);
      });
  };

  return (
    <Form onSubmit={handleSubmit}>
      <StyledTextareaAutosize
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="고려대 공간에 대해 궁금한 점을 질문해주세요!"
        maxRows={10}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
          }
        }}
      />
      <Button type="submit">
        <FaPaperPlane />
      </Button>
    </Form>
  );
};

const Form = styled.form`
  display: flex;
  // align-items: center; /* Center align items vertically */
  padding: 10px;
  position: fixed;
  bottom: 0;
  width: 75%;
  background-color: white;
  box-shadow: 0px -1px 5px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  // margin-left: 200px;
`;

const StyledTextareaAutosize = styled(TextareaAutosize)`
  flex: 1; /* Grow to fill available space */
  border: 1px solid #eee;
  background-color: #f4f4f4;
  border-radius: 3px;
  padding: 10px;
  margin-right: 10px;
  resize: none;
  overflow: auto;
  font-family: inherit;
  font-size: 16px;
  min-height: 40px; /* Initial height */
  max-height: 500px; /* Max height */
  &:focus,
  &:active {
    border-color: #a33b39;
    outline: none;
  }
`;

const Button = styled.button`
  width: 60px; /* Fixed width for button, adjust as needed */
  height: 60px; /* Take up full height of container */
  padding: 0px; /* Remove padding to fit better */
  border: none;
  background-color: #a33b39;
  color: white;
  cursor: pointer;
  border-radius: 3px;
  font-size: 1em;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover {
    background-color: #cd7270; /* Change this to the desired lighter shade */
  }
`;
