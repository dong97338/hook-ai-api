import express from 'express';
import axios from 'axios';
// import cheerio from 'cheerio';
// import { v4 as uuidv4 } from 'uuid';
import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';
import OpenAIApi from 'openai';


const useGPT = 0;

dotenv.config();

const app = express();
app.use(express.json());

const openai = new OpenAIApi({ key: process.env.OPENAI_API_KEY });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

const index = pinecone.Index('data');

const headers = {
  'Authorization': `Bearer ${OPENAI_API_KEY}`,
  'Content-Type': 'application/json'
};

// Pinecone 인덱스 연결 설정
const pineconeConfig = {
  baseURL: 'https://api.pinecone.io/vectors/query',
  headers: { 'Api-Key': PINECONE_API_KEY }
};

app.post('/query', async (req, res) => {
  const userQuery = req.body.query;

  // 쿼리 요약 처리
  const summarizationResponse = await axios.post('https://api.openai.com/v1/engines/gpt-3.5-turbo-0125/completions', {
    prompt: `유저 질문 요약: ${userQuery}`,
    max_tokens: 150,
    temperature: 0.5,
  }, { headers });

  const summarizedQuery = summarizationResponse.data.choices[0].text;

  // Pinecone을 사용한 컨텍스트 검색
  const searchResponse = await axios.post(pineconeConfig.baseURL, {
    vector: summarizedQuery, // 이 부분은 실제 벡터화 로직으로 대체해야 함
    top_k: 7
  }, { headers: pineconeConfig.headers });

  const contexts = searchResponse.data.results.map(result => result.value.text).join('\n\n');

  // 응답 생성
  const chatResponse = await axios.post('https://api.openai.com/v1/engines/gpt-3.5-turbo-0125/completions', {
    prompt: `[Context]\n${contexts}`,
    max_tokens: 500,
    temperature: 0.5,
  }, { headers });

  const responseText = chatResponse.data.choices[0].text;

  res.json({ response: responseText });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
