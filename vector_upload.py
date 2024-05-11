from langchain.text_splitter import RecursiveCharacterTextSplitter
import uuid
from openai import OpenAI
from tqdm import tqdm
from pinecone import Pinecone

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
import time
import json

def fetch_dynamic_web_data(url):
    # Chrome WebDriver 설정
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service)
    
    # 웹 페이지 로드
    driver.get(url)
    time.sleep(5)  # 페이지가 완전히 로드될 시간 기다림

    # 페이지 소스 가져오기
    html = driver.page_source
    soup = BeautifulSoup(html, 'html.parser')
    
    # WebDriver 종료
    driver.quit()
    
    return soup

def extract_text(soup):
    # 웹 페이지에서 텍스트 추출 (불필요한 태그 제거)
    for script in soup(["script", "style", "head", "title", "meta", "[document]"]):
        script.decompose()  # 태그 제거
    texts = soup.get_text()
    lines = [line.strip() for line in texts.splitlines() if line.strip()]
    return "\n".join(lines)

text_array = []

def update_json_file(file_path):
    # JSON 파일 로드
    with open(file_path, 'r') as file:
        urls_info = json.load(file)
    
    # 처리된 데이터 저장
    for url_info in urls_info['urls']:
        if not url_info.get('uploaded', False):  # 기본값은 False로 설정
            # URL의 웹 페이지에서 텍스트 추출
            soup = fetch_dynamic_web_data(url_info['url'])
            text_data = extract_text(soup)
            
            # 텍스트 데이터 출력(또는 저장)
            print(f"Extracted text from {url_info['url']}:")
            print(text_data)
            
            text_array.append(text_data)
            
            # 업로드 상태를 True로 업데이트
            url_info['uploaded'] = True

    # 변경된 정보를 파일에 다시 쓰기
    with open(file_path, 'w') as file:
        json.dump(urls_info, file, indent=2)

# 파일 경로 지정
json_file_path = 'urls.json'

# 파일 처리 및 업데이트
update_json_file(json_file_path)






from configparser import ConfigParser

config = ConfigParser()
config.read('config.ini')

OPENAI_API_KEY = config['DEFAULT']['OPENAI_API_KEY']
PINECONE_API_KEY = config['DEFAULT']['PINECONE_API_KEY']

pc = Pinecone(api_key=PINECONE_API_KEY)
index = pc.Index("data")

client = OpenAI(api_key=OPENAI_API_KEY)

# LLM을 활용하여 summarization 하기


# with open("김중업.txt", 'rt', encoding='UTF8') as f:
#   text = f.read()

for text in text_array:
  
  response = client.chat.completions.create(
    model="gpt-3.5-turbo-0125",
    messages=[
        {
            "role": "system",
            "content": "너는 웹페이지의 제목을 만드는 봇이야. 내용을 읽고 제목을 만들어줘"
        },
        {
            "role": "user",
            "content": f"[content]{text}"
        }
    ],
    max_tokens=1024
  )
  
  title = response.choices[0].message.content
  print(title)

  response = client.chat.completions.create(
      model="gpt-3.5-turbo-0125",
      messages=[
          {
              "role": "system",
              "content": "너는 웹페이지를 요약하는 봇이야. 내용을 하나의 긴 문단으로 요약해줘"
          },
          {
              "role": "user",
              "content": f"[title]{title}\n[content]{text}"
          }
      ],
      max_tokens=1024
  )

  summarization_metadata = response.choices[0].message.content

  # print(summarization_metadata)

  # 이 앞부분까지 테스트 완료, chunk 만들기

  text_splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(
      chunk_size=512
  )
  chunks = text_splitter.split_text(text)

  vectors = []

  for chunk in tqdm(chunks, desc="Processing chunks"):
      chunk_with_summarization = f"[title]{title}\n[summary]{summarization_metadata}\n[chunk]{chunk}"
      response = client.embeddings.create(input=chunk_with_summarization, model="text-embedding-3-small")
      chunk_embeddings = response.data[0].embedding

      chunk_id = str(uuid.uuid4())

      vector_dict = {
          "id": chunk_id,
          "values": chunk_embeddings,
          "metadata": {"chunk": chunk_with_summarization}
      }
      vectors.append(vector_dict)

  # print(vectors[0])
  batch_size = 10
  num_batches = len(vectors) // 10 + 1

  for i in tqdm(range(num_batches), desc="Processing chunks"):
      start_idx = i * batch_size
      end_idx = start_idx + batch_size

      batch_vectors = vectors[start_idx:end_idx]

      index.upsert(vectors=batch_vectors, namespace="hook")





