from typing import List, Tuple  # Tuple 추가
import certifi
import ssl
import aiohttp
from langchain.agents import initialize_agent, load_tools, AgentType, AgentExecutor
from langchain.callbacks.base import BaseCallbackHandler
from langchain.chat_models import ChatOpenAI
from langchain.memory import ConversationBufferMemory
from chat.messages.chat_message_repository import ChatMessageRepository
from chat.models import MessageSender, ChatMessage
from project import settings
import os
from chat.utils import load_documents_from_csv, CSV_FILE_PATH
from langchain.tools import Tool
import logging
from konlpy.tag import Mecab
import faiss
import numpy as np
from langchain.embeddings import OpenAIEmbeddings
import subprocess

logger = logging.getLogger(__name__)

# 인증서 경로 설정
cert_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..', 'GTS Root R4.cer'))
os.environ['REQUESTS_CA_BUNDLE'] = cert_path

from dotenv import load_dotenv

load_dotenv()

# MeCab 초기화
mecab = Mecab(dicpath='/opt/homebrew/lib/mecab/dic/mecab-ko-dic')

class CustomClientSession(aiohttp.ClientSession):
    def __init__(self, *args, **kwargs):
        ssl_context = ssl.create_default_context(cafile=certifi.where())
        kwargs['connector'] = aiohttp.TCPConnector(ssl=ssl_context)
        super().__init__(*args, **kwargs)

class AgentFactory:

    def __init__(self):
        self.chat_message_repository = ChatMessageRepository()
        logger.debug("Initializing AgentFactory")
        self.documents = load_documents_from_csv(CSV_FILE_PATH)
        self.tokenizer = mecab
        self.embeddings = OpenAIEmbeddings(openai_api_key=settings.openai_api_key)
        self.doc_embeddings, self.index = self._create_embeddings_and_index()

    def _create_embeddings_and_index(self):
        logger.debug("Creating embeddings and index")
        # 한국어 텍스트 전처리 및 임베딩 생성
        texts = [doc['content'] for doc in self.documents]
        tokenized_texts = [" ".join(self.tokenizer.morphs(text)) for text in texts]
        
        # OpenAI Embeddings 사용
        doc_embeddings = self.embeddings.embed_documents(tokenized_texts)
        
        # Faiss 인덱스 생성
        dimension = len(doc_embeddings[0])
        index = faiss.IndexFlatL2(dimension)
        index.add(np.array(doc_embeddings))
        
        return doc_embeddings, index

    def retrieve_documents(self, query: str):
        logger.debug(f"Retrieving documents for query: {query}")
        tokenized_query = " ".join(self.tokenizer.morphs(query))
        query_embedding = self.embeddings.embed_query(tokenized_query)
        
        # 검색 쿼리를 통해 유사 문서 검색
        D, I = self.index.search(np.array([query_embedding]), k=3)  # 상위 3개 검색
        matching_documents = [self.documents[i]['content'] for i in I[0]]
        logger.debug(f"Query: {query}, Matched {len(matching_documents)} documents, Top 3 documents: {matching_documents}")
        return matching_documents

    async def create_agent(
        self,
        tool_names: List[str],
        chat_id: str = None,
        streaming=False,
        callback_handlers: List[BaseCallbackHandler] = None,
        model_name: str = "gpt-4o-mini-2024-07-18"
    ) -> Tuple[AgentExecutor, ChatOpenAI]:  # Tuple 사용
        logger.debug("Creating LLM")
        llm = ChatOpenAI(
            temperature=0,
            openai_api_key=settings.openai_api_key,
            streaming=streaming,
            callbacks=callback_handlers,
            model_name=model_name
        )
        llm.client.session = CustomClientSession()

        def rag_tool_func(inputs):
            query = inputs.get("input", "") if isinstance(inputs, dict) else str(inputs)
            retrieved_docs = self.retrieve_documents(query)
            logger.debug(f"Retrieved documents: {retrieved_docs}")
            combined_text = " ".join(retrieved_docs + [query])
            from langchain.schema import HumanMessage
            human_message = HumanMessage(content=combined_text)
            result = llm([human_message])
            logger.debug(f"Type of result from llm.predict: {type(result)}")
            return {
                "response": str(result[0].content) if isinstance(result, list) and len(result) > 0 else str(result),
                "retrieved_docs": retrieved_docs
            }

        rag_tool = Tool(name="RAGTool", func=rag_tool_func, description="Retrieve documents and generate responses")
        tools = [rag_tool] + load_tools(tool_names, llm=llm)
        memory = await self._load_agent_memory(chat_id)
        logger.debug("Initializing agent")
        agent = initialize_agent(
            tools=tools,
            llm=llm,
            agent=AgentType.CHAT_CONVERSATIONAL_REACT_DESCRIPTION,
            verbose=True,
            memory=memory
        )
        return agent, llm

    async def _load_agent_memory(self, chat_id: str = None) -> ConversationBufferMemory:
        memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True)
        if chat_id:
            chat_messages: List[ChatMessage] = await self.chat_message_repository.get_chat_messages(chat_id)
            for message in chat_messages:
                if message.sender == MessageSender.USER.value:
                    memory.chat_memory.add_user_message(message.content)
                elif message.sender == MessageSender.AI.value:
                    memory.chat_memory.add_ai_message(message.content)
        return memory
