# consumers.py
import json
import os
import django
import asyncio
import logging

from chat.agents.agent_factory import AgentFactory
from chat.agents.callbacks import AsyncStreamingCallbackHandler
from chat.messages.chat_message_repository import ChatMessageRepository

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')
django.setup()

from channels.generic.websocket import AsyncWebsocketConsumer
from langchain.agents import AgentExecutor
from chat.models import MessageSender

logger = logging.getLogger(__name__)

class ChatConsumer(AsyncWebsocketConsumer):
    # The LLM agent for this chat application
    agent: AgentExecutor

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.agent_factory = AgentFactory()
        self.chat_message_repository = ChatMessageRepository()

    async def connect(self):
        # Get the chat_id from the client
        chat_id = self.scope['url_route']['kwargs'].get('chat_id')

        # Create the agent when the websocket connection with the client is established
        self.agent, self.llm = await self.agent_factory.create_agent(
            tool_names=["llm-math"],
            chat_id=chat_id,
            streaming=True,
            callback_handlers=[AsyncStreamingCallbackHandler(self)],
        )

        await self.accept()

    async def disconnect(self, close_code):
        pass

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json['message']
        chat_id = text_data_json['chat_id']

        # Forward the message to LangChain
        response_data = await self.message_agent(message, chat_id)
        response = response_data["response"]
        retrieved_docs = response_data.get("retrieved_docs", [])

        # 응답 형식을 정리하여 전송
        formatted_response = self.format_response(response)

        # Send the response from the OpenAI Chat API to the frontend client
        await self.send(text_data=json.dumps({
            'message': formatted_response,
            'type': 'answer',
            'retrieved_docs': retrieved_docs
        }))

    async def message_agent(self, message: str, chat_id: str):
        # Save the user message to the database
        await self.chat_message_repository.save_message(message=message, sender=MessageSender.USER.value, chat_id=chat_id)

        # Call the agent asynchronously
        response_data = await self.run_agent_async(message)

        if isinstance(response_data, str):
            response_data = {"response": response_data, "retrieved_docs": []}

        # 응답 형식을 정리한 후 저장
        formatted_response = self.format_response(response_data["response"])

        # Save the AI message to the database
        await self.chat_message_repository.save_message(message=formatted_response, sender=MessageSender.AI.value, chat_id=chat_id)

        response_data["response"] = formatted_response
        return response_data

    async def run_agent_async(self, message: str):
        loop = asyncio.get_event_loop()
        try:
            logger.debug(f"Sending request to OpenAI API with message: {message}")
            
            # 건물 존재 여부를 체크합니다.
            if not self.agent_factory.check_building_existence(message):
                return {"response": "해당 건물이나 장소는 고려대학교에 없습니다.", "retrieved_docs": []}
            
            # 건물 존재 여부를 체크한 후에도 유사도 검색을 진행합니다.
            response_data = await loop.run_in_executor(None, self.agent.run, {"input": message})
            logger.debug(f"Received response from OpenAI API: {response_data}")

            if isinstance(response_data, str):
                # 문자열 응답을 json으로 변환
                response_data = {"action": "Final Answer", "action_input": response_data}

            if isinstance(response_data, dict) and "action" in response_data and response_data["action"] == "Final Answer":
                logger.debug("Forcing RAGTool call due to 'Final Answer' response.")
                query = message
                retrieved_docs = self.agent_factory.retrieve_documents(query)
                combined_text = " ".join(retrieved_docs + [query])
                from langchain.schema import HumanMessage

                human_message = HumanMessage(content=combined_text)

                llm_response = await loop.run_in_executor(None, self.llm.predict_messages, [human_message])
                # 응답 형식 유지
                final_response_content = str(llm_response[0].content) if isinstance(llm_response, list) and len(llm_response) > 0 else str(llm_response)
                
                final_response = {
                    "response": final_response_content,
                    "retrieved_docs": retrieved_docs
                }
                logger.debug(f"Final LLM response: {final_response}")
                return final_response
            return response_data
        except Exception as e:
            logger.error(f"Error running agent: {e}")
            return {"response": "An error occurred while processing your request.", "retrieved_docs": []}

    def format_response(self, response: str) -> str:
        """응답 형식을 정리하는 함수"""
        formatted_response = response.replace("content='", "").replace("' additional_kwargs={} example=False", "").replace("\\n", "\n")
        formatted_response = formatted_response.replace("**", "")  # Markdown 문법 제거
        return formatted_response
