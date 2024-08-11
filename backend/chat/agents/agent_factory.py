from typing import List, Tuple
import certifi
import ssl
import aiohttp
from langchain.agents import initialize_agent, load_tools, AgentType, AgentExecutor
from langchain.callbacks.base import BaseCallbackHandler
from langchain.chat_models import ChatOpenAI
from langchain.memory import ConversationBufferMemory
from backend.chat.messages.chat_message_repository import ChatMessageRepository
from chat.models import MessageSender, ChatMessage
from backend.project import settings
import os
from chat.utils import load_documents_from_csv, CSV_FILE_PATH
from langchain.tools import Tool
import logging
from konlpy.tag import Mecab
import faiss
import numpy as np
from langchain.embeddings import OpenAIEmbeddings
import re
from fuzzywuzzy import fuzz

logger = logging.getLogger(__name__)

KOREA_UNIVERSITY_BUILDINGS = [
    "아이스링크", "학군단", "수당삼양패컬티하우스", "법학관", "라이시움(평생교육원)", "중앙광장(중광)", 
    "백주년기념관(백기)", "Science pi-Park", "문과대학", "중앙도서관(중도)", "민주광장(민광)" 
    "프런티어관(신긱)", "한국어교육관", "중앙광장지하(중지)", "현대자동차 경영관(현차관)", "4.18기념관", 
    "인촌기념관", "우당교양관(교양관)", "인문사회관", "산학관", "창의관", "안암학사 고시동", "민족문화관", 
    "운초우선교육관", "기초과학관", "간호대학", "메디힐지구환경관", "타이거플라자", "로봇융합관", 
    "안암학사 남학생동(구긱)", "체육생활관", "CJ법학관", "안암인터내셔널하우스", "안암글로벌하우스", 
    "관리동", "교우회관", "정경관", "미디어관(미관)", "과학도서관(과도)", "우정정보관", "생명과학관(동관)", 
     "생명과학관", "학생회관", "LG-POSCO경영관(엘포관)", "CJ 인터내셔널하우스", 
    "아산이학관", "환경실험관", "해송법학도서관(해도/법도)", "공학관", "화정체육관", "신공학관(신공)", 
    "사범대학", "애기능생활관", "SK미래관(에미관)", "하나스퀘어(하스)", "경영본관", 
    "미래융합기술관", "국제관", "R&D 센터", "애기능학생회관", "파이빌 99", "본관", 
    "CJ식품안전관", "강당", "하나과학관", "안암학사 여학생동(구긱)", "동원글로벌리더십홀(동글리)", "이학관별관"
]

# 인증서 경로 설정
cert_path = certifi.where()
os.environ['REQUESTS_CA_BUNDLE'] = cert_path

from dotenv import load_dotenv

load_dotenv()

# MeCab 초기화
mecab = Mecab(dicpath=os.getenv('MECAB_PATH'))

class CustomClientSession(aiohttp.ClientSession):
    def __init__(self, *args, **kwargs):
        ssl_context = ssl.create_default_context(cafile=certifi.where())
        kwargs['connector'] = aiohttp.TCPConnector(ssl=ssl_context)
        super().__init__(*args, **kwargs)

def extract_aliases(buildings):
    alias_to_full_name = {}
    for building in buildings:
        main_name = re.split('[()]', building)[0].strip()
        aliases = re.findall(r'\(([^)]+)\)', building)
        for alias in aliases:
            alias_to_full_name[alias.strip()] = main_name
    return alias_to_full_name

def replace_aliases_with_full_names(query: str, alias_to_full_name: dict) -> str:
    for alias, full_name in alias_to_full_name.items():
        query = re.sub(r'\b' + re.escape(alias) + r'\b', full_name, query)
    return query
class AgentFactory:

    def __init__(self):
        self.chat_message_repository = ChatMessageRepository()
        logger.debug("Initializing AgentFactory")
        self.documents = load_documents_from_csv(CSV_FILE_PATH)
        self.tokenizer = mecab
        self.embeddings = OpenAIEmbeddings(openai_api_key=settings.openai_api_key)
        self.doc_embeddings, self.index = self._create_embeddings_and_index()
        self.building_keywords = self.extract_building_keywords(KOREA_UNIVERSITY_BUILDINGS)
        self.alias_to_full_name = extract_aliases(KOREA_UNIVERSITY_BUILDINGS)

        # 시스템 메시지 설정
        self.system_message = """
        You are a knowledgeable assistant specializing in providing information about Korea University. 
        You should respond in Korean and only provide information about the buildings and locations within Korea University. 
        If you receive a question about a location or building that does not exist within Korea University, 
        inform the user that the location or building is not part of Korea University. 
        If you don't know the answer to a question, simply say you don't know.
        Do Not convey inaccurate information. Do not pass on information that you are not sure about.

        List of buildings at Korea University:
        """ + ", ".join(KOREA_UNIVERSITY_BUILDINGS)

    def _create_embeddings_and_index(self):
        logger.debug("Creating embeddings and index")
        # 한국어 텍스트 전처리 및 임베딩 생성
        titles = [doc['title'] for doc in self.documents]
        tokenized_titles = [" ".join(self.tokenizer.morphs(title)) for title in titles]

        logger.debug(f"Tokenized titles: {tokenized_titles}")

        # OpenAI Embeddings 사용
        doc_embeddings = self.embeddings.embed_documents(tokenized_titles)
        
        logger.debug(f"Document embeddings shape: {np.array(doc_embeddings).shape}")

        # Faiss 인덱스 생성
        dimension = len(doc_embeddings[0])
        index = faiss.IndexFlatL2(dimension)
        index.add(np.array(doc_embeddings))
        
        return doc_embeddings, index

    def retrieve_documents(self, query: str):
        logger.debug(f"Retrieving documents for query: {query}")
        building = self.check_building_existence(query)
        if building:
            query = query.replace(query, building)  # 정식 명칭으로 대체
        tokenized_query = " ".join(self.tokenizer.morphs(query))
        logger.debug(f"Tokenized query: {tokenized_query}")
        
        query_embedding = self.embeddings.embed_query(tokenized_query)
        logger.debug(f"Query embedding shape: {np.array(query_embedding).shape}")
        
        # 검색 쿼리를 통해 유사 문서 검색
        D, I = self.index.search(np.array([query_embedding]), k=3)  # 상위 3개 검색
        matching_documents = [self.documents[i]['content'] for i in I[0]]
        logger.debug(f"Query: {query}, Matched {len(matching_documents)} documents, Top 3 documents: {matching_documents}")
        return matching_documents

    def extract_building_keywords(self, buildings):
        keywords = {}
        for building in buildings:
            # 괄호 안의 내용 분리
            main_name, *aliases = re.split(r'\(|\)', building)
            main_name = main_name.strip()
            tokens = self.tokenizer.nouns(main_name)
            combined_tokens = self.combine_nouns(tokens)
            main_keyword = " ".join(combined_tokens)
            keywords[main_keyword] = main_name  # 정식 명칭 매핑
            # 별칭도 키워드에 추가
            for alias in aliases:
                alias_tokens = self.tokenizer.nouns(alias)
                combined_alias_tokens = self.combine_nouns(alias_tokens)
                alias_keyword = " ".join(combined_alias_tokens)
                keywords[alias_keyword] = main_name  # 정식 명칭 매핑
        return keywords


    def combine_nouns(self, tokens: List[str]) -> List[str]:
        combined_tokens = []
        skip_next = False

        for i, token in enumerate(tokens):
            if skip_next:
                skip_next = False
                continue
            if i + 1 < len(tokens) and len(token) > 1 and len(tokens[i + 1]) > 1:
                combined_tokens.append(token + tokens[i + 1])
                skip_next = True
            else:
                combined_tokens.append(token)

        return combined_tokens


    def check_building_existence(self, query: str) -> bool:
        logger.debug(f"Checking building existence in query: {query}")

        def fuzzy_similarity(query_phrase: str, building_keyword: str) -> int:
            return fuzz.partial_ratio(query_phrase, building_keyword)

        threshold = 80  # 유사도 임계값 (0-100)

        if "에미관" in query:
            query = query.replace("에미관", "SK미래관")

        query_nouns = self.tokenizer.nouns(query)
        combined_query_nouns = self.combine_nouns(query_nouns)
        combined_query_phrase = " ".join(combined_query_nouns)

        for building in KOREA_UNIVERSITY_BUILDINGS:
            main_name, *aliases = building.replace("(", " ").replace(")", "").split()
            # aliases는 빈 문자열이 아닌 경우에만 포함하도록 필터링
            building_keywords = [main_name] + [alias for alias in aliases if alias]

            for building_keyword in building_keywords:
                tokens = self.tokenizer.nouns(building_keyword)
                combined_tokens = self.combine_nouns(tokens)
                building_keyword_combined = " ".join(combined_tokens)
                similarity = fuzzy_similarity(combined_query_phrase, building_keyword_combined)
                logger.debug(f"Building: {building}, Query Phrase: {combined_query_phrase}, Building Keyword: {building_keyword_combined}, Similarity: {similarity}")
                if similarity >= threshold:
                    logger.debug(f"Building {building} exists in the query.")
                    return main_name
        logger.debug("No matching building found in the query.")
        return None


    async def create_agent(
        self,
        tool_names: List[str],
        chat_id: str = None,
        streaming=False,
        callback_handlers: List[BaseCallbackHandler] = None,
        model_name: str = "gpt-4o-mini-2024-07-18"
    ) -> Tuple[AgentExecutor, ChatOpenAI]:
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
            if not self.check_building_existence(query):
                return {"response": "해당 건물이나 장소는 고려대학교에 없습니다.", "retrieved_docs": []}
            query = query.replace(query, self.check_building_existence(query))
            retrieved_docs = self.retrieve_documents(query)
            logger.debug(f"Retrieved documents: {retrieved_docs}")
            combined_text = self.system_message + "\n\n" + " ".join(retrieved_docs + [query])
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