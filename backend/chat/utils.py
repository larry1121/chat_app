# utils.py
import csv
import os
import logging

# 로거 설정
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
handler = logging.StreamHandler()
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)

def load_documents_from_csv(file_path):
    documents = []
    logger.debug(f"Loading documents from {file_path}")
    try:
        with open(file_path, mode='r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                documents.append({
                    'title': row['title'],
                    'content': row['content']
                })
        logger.debug(f"Loaded {len(documents)} documents")
    except Exception as e:
        logger.error(f"Error loading documents: {e}")
    return documents

# 프로젝트 루트 경로 설정
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_FILE_PATH = os.path.join(BASE_DIR, 'data', 'QA.csv')
