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

export const ChatInput: React.FC<ChatInputProps> = ({onNewUserMessage, onNewChatCreated, chatId}) => {
    const [message, setMessage] = useState('');

    const handleSubmit = (event: React.FormEvent) => {
      event.preventDefault();

      if (message.trim() === '') return;

      if (chatId) {
        // If there is a chatId, just send the message.
        const newMessage = {sender: 'USER', content: message};
        onNewUserMessage(chatId, newMessage)
      } else {
        // If there is no chatId, create a new chat.
        createChat()
      }
      setMessage(''); // Clear the input message
    }

    const createChat = () => {
      fetch(`${process.env.REACT_APP_API_BASE_URL}/chats/`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name: 'New Chat'}) // Adjust this as necessary.
      })
        .then((response) => response.json())
        .then((newChat) => {
          // Update listeners that a new chat was created.
          onNewChatCreated(newChat.id)

          // Send the message after a timeout to ensure that the Chat has been created
          setTimeout(function () {
            // This block of code will be executed after 0.5 seconds
            onNewUserMessage(newChat.id, {sender: 'USER', content: message})
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
  }
;

const Form = styled.form`
  display: flex;
  align-items: flex-start;
  padding: 10px;
  border-top: 1px solid #eee;
`;

const StyledTextareaAutosize = styled(TextareaAutosize)`
  flex-grow: 1;
  border: 1px solid #eee;
  background-color: #f4f4f4;
  border-radius: 3px;
  padding: 10px;
  margin-right: 10px;
  resize: none;
  overflow: auto;
  font-family: inherit;
  font-size: 16px;
  min-height: 14px; // Initial height
  max-height: 500px; // Max height
  &:focus,
  &:active {
    border-color: #a33b39;
    outline: none;
  }
`;

const Button = styled.button`
  height: 40px;
  padding: 10px 20px;
  border: none;
  background-color: #a33b39;
  color: white;
  cursor: pointer;
  border-radius: 3px;
  font-size: 1em;
  align-self: flex-end;
  &:hover {
    background-color: #cd7270; /* Change this to the desired lighter shade */
  }
  display: flex;
  align-items: center;
  justify-content: center;
`;
