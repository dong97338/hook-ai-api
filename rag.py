import uuid
from openai import OpenAI
from tqdm import tqdm
from pinecone import Pinecone
from configparser import ConfigParser

config = ConfigParser()
config.read('config.ini')

pc = Pinecone(api_key=PINECONE_API_KEY)
index = pc.Index("data")

client = OpenAI(api_key=OPENAI_API_KEY)

messages = []
retrieved_chunks = []
summarized_query = ""
system_prompt = {
    "role": "system",
    "content": """당신은 유저가 클리핑한 사이트에서 나타난 정보를 바탕으로 대답하는 챗봇입니다.
    당신은 사람들에게 다음과 같이 대답해야 합니다:
    - 친절한 말투
    - 항상 존댓말 사용
    - 적절한 이모지 사용
    당신은 반드시 제공하는 [Context]에 있는 내용을 기반으로 살을 붙여 답변을 생성해야 합니다."""
}
messages.append(system_prompt)

def handle_user_input(prompt):
    user_prompt = {
        "role": "user",
        "content": prompt
    }
    messages.append(user_prompt)
    print("User:", prompt)

    recent_query = ""
    for message in messages[-3:]:
        recent_query += f'{message["role"]}"\n"{message["content"]}"\n\n"'

    recent_query_prompt = {
        "role": "user",
        "content": f"2 pair of question-answers.\n{recent_query}"
    }

    summarization_system_prompt = {
        "role": "system",
        "content": "유저가 입력한 여러 질문을 파악하고 유저가 궁금한 것을 하나의 긴 문장으로 변환해줘. 대화 중간에 주제가 바뀌었으면 유저가 입력한 최신 주제에 맞춰서 정리해줘."
    }

    response = client.chat.completions.create(
        model="gpt-3.5-turbo-0125",
        messages=[summarization_system_prompt, recent_query_prompt],
        temperature=0.5,
        max_tokens=1024,
    )

    summarized_query = response.choices[0].message.content
    print("Summarized Query:", summarized_query)

    # Query Embeddings 생성
    response = client.embeddings.create(input=prompt, model="text-embedding-3-small")
    query_embeddings = response.data[0].embedding

    # Contexts 검색
    retrieved_chunks = index.query(
        namespace="hook",
        vector=query_embeddings,
        top_k=7,
        include_values=False,
        include_metadata=True,
    )
    contexts = ""

    for i, match in enumerate(retrieved_chunks.matches, start=1):
        context = match["metadata"]["chunk"]
        print(f"참조{i}: {context}\n")
      
        contexts += context + "\n\n"

    context_prompt = {
        "role" : "system",
        "content" : f"[Context]\n{contexts}"
    }
    messages.append(context_prompt)

    # print('messages:', messages)

    # 챗봇에 전달하여 응답 생성
    full_response = client.chat.completions.create(
          model="gpt-3.5-turbo-0125",
          messages=messages,
          temperature=0.5,
          max_tokens=1024,
    ).choices[0].message.content
    print("Assistant:", full_response)
    messages.append({"role": "assistant", "content": full_response})

while True:
    prompt = input("클리핑한 웹사이트에서 궁금한 정보를 물어보세요😊: ")
    handle_user_input(prompt)
