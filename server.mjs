import express from 'express'
import axios from 'axios'

import {Pinecone} from '@pinecone-database/pinecone'
import dotenv from 'dotenv'
import {fetchAndExtractText, processText, getEmbeddings, generateResponse} from './functions.js'
import OpenAIApi from 'openai'

dotenv.config()

const app = express()
app.use(express.json())

const pinecone = new Pinecone({apiKey: process.env.PINECONE_API_KEY})

// Pinecone Index 초기화
const index = pinecone.Index('data')

app.post('/process-urls', async (req, res) => {
  console.log('Received request to process URLs.')
  const urls = req.body.urls
  console.log(`Processing ${urls.length} URLs.`)

  const texts = await Promise.all(urls.map(url => fetchAndExtractText(url)))
  console.log('Text extraction completed.')

  console.log('texts', texts )

  const processedData = await Promise.all(texts.map(text => processText(text)))
  console.log('Text processing completed.')

  // Pinecone에 데이터 업로드
  let vectors = processedData.flatMap(data => data.vectors)
  console.log(`Upserting ${vectors.length} vectors into Pinecone.`)

  let batch_size = 10
  let num_batches = vectors.length / 10 // vectors.length / 10 + 1이었는데 마지막에서 values가 빈칸으로 나오는 오류때문에 일단 뺐음

  for (let i = 0; i < num_batches; ++i) {
    console.log(`Processing batch ${i + 1} of ${num_batches}`)
    let start_idx = i * batch_size
    let end_idx = start_idx + batch_size
    let batch_vectors = vectors.slice(start_idx, end_idx).map(vector => ({
      id: vector.id,
      values: vector.values,
      metadata: vector.metadata
    }))
    // console.log(batch_vectors)
    await index.namespace('hook').upsert(batch_vectors)
  }

  // index.namespace('hook').upsert({ vectors });

  res.json({processedData})
  console.log('Data returned to the client.')
})

const PORT = process.env.PORT || 3389
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

const messages = []
const systemPrompt = {
  role: 'system',
  content: `당신은 유저가 클리핑한 사이트에서 나타난 정보를 바탕으로 대답하는 챗봇입니다.
  당신은 사람들에게 다음과 같이 대답해야 합니다:
  - 친절한 말투
  - 항상 존댓말 사용
  - 적절한 이모지 사용
  당신은 반드시 제공하는 [Context]에 있는 내용을 기반으로 살을 붙여 답변을 생성해야 합니다.`
}
messages.push(systemPrompt)

// Pinecone 인덱스 연결 설정

app.post('/query', async (req, res) => {
  const userQuery = req.body.query

  console.log('userQuery: ', userQuery)

  messages.push({role: 'user', content: userQuery})

  const queryEmbeddings = await getEmbeddings(userQuery)

  const retrievedChunks = await index.namespace('hook').query({
    vector: queryEmbeddings,
    topK: 7,
    includeMetadata: true
  })

  let contexts = ''

  for (let context of retrievedChunks.matches) {
    contexts += context.metadata.chunk + '\n\n'
  }

  const contextPrompt = {
    role: 'system',
    content: `[Context]${contexts}`
  }

  messages.push(contextPrompt)

  const fullResponse = await generateResponse(messages)

  // console.log('messages: ', messages)

  console.log('Full response: ', fullResponse)

  res.json({response: fullResponse})
})
