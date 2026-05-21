// U-G24 임베딩 — provider 추상화 (voyage 우선, openai/mock 대체)
//
// 호출자는 provider 신경쓰지 않고 embed(text) 사용.
// .env 또는 settings 테이블의 'embed_provider' 키로 선택.
//   - voyage   : voyage-multilingual-2 (한국어 강함, $0.12/1M tokens)
//   - openai   : text-embedding-3-small (보편, $0.02/1M tokens)
//   - mock     : SHA256 → 1024차원 deterministic (개발/테스트용, 검색 정확도 낮음)
//
// 모델별 차원이 달라 BLOB 비교 전에 embedding_model 컬럼 확인 필수.
// 응답 임베딩은 Float32Array → Buffer로 직렬화하여 SQLite BLOB에 저장.

const crypto = require('crypto');

const PROVIDER = (process.env.EMBED_PROVIDER || 'voyage').toLowerCase();

const PROVIDER_INFO = {
  voyage: {
    model: process.env.VOYAGE_MODEL || 'voyage-multilingual-2',
    dim: 1024,
    apiKeyEnv: 'VOYAGE_API_KEY',
    endpoint: 'https://api.voyageai.com/v1/embeddings'
  },
  openai: {
    model: process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small',
    dim: 1536,
    apiKeyEnv: 'OPENAI_API_KEY',
    endpoint: 'https://api.openai.com/v1/embeddings'
  },
  mock: {
    model: 'mock-sha256-1024',
    dim: 1024,
    apiKeyEnv: null,
    endpoint: null
  }
};

function getInfo() {
  const info = PROVIDER_INFO[PROVIDER];
  if (!info) {
    throw new Error(`[embed] 알 수 없는 provider: ${PROVIDER}. (voyage|openai|mock)`);
  }
  if (info.apiKeyEnv && !process.env[info.apiKeyEnv]) {
    throw new Error(`[embed] ${info.apiKeyEnv} 환경변수 미설정. (.env 확인)`);
  }
  return info;
}

async function _embedVoyage(texts, info) {
  const res = await fetch(info.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env[info.apiKeyEnv]}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: info.model,
      input: texts,
      input_type: 'document'
    })
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`[embed:voyage] ${res.status} ${res.statusText} — ${err.slice(0, 200)}`);
  }
  const json = await res.json();
  return json.data.map(d => new Float32Array(d.embedding));
}

async function _embedOpenAI(texts, info) {
  const res = await fetch(info.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env[info.apiKeyEnv]}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model: info.model, input: texts })
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`[embed:openai] ${res.status} ${res.statusText} — ${err.slice(0, 200)}`);
  }
  const json = await res.json();
  return json.data.map(d => new Float32Array(d.embedding));
}

// SHA256 → [-1, 1] 범위 1024차원. 같은 입력은 같은 벡터 (deterministic).
// 코사인 유사도가 의미를 갖지는 않음 — 인프라 검증용.
function _embedMock(texts) {
  return texts.map(t => {
    const dim = 1024;
    const out = new Float32Array(dim);
    let seed = crypto.createHash('sha256').update(String(t)).digest();
    for (let i = 0; i < dim; i++) {
      if ((i % 32) === 0 && i > 0) {
        seed = crypto.createHash('sha256').update(seed).digest();
      }
      const byte = seed[i % 32];
      out[i] = (byte / 255) * 2 - 1;
    }
    // L2 정규화 — cosine = dot product
    let norm = 0;
    for (let i = 0; i < dim; i++) norm += out[i] * out[i];
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < dim; i++) out[i] /= norm;
    return out;
  });
}

async function embedBatch(texts) {
  if (!Array.isArray(texts)) throw new Error('[embed] embedBatch는 배열 입력');
  if (!texts.length) return [];
  const info = getInfo();
  const cleaned = texts.map(t => String(t || '').slice(0, 8192).trim()).map(t => t || ' ');
  switch (PROVIDER) {
    case 'voyage': return await _embedVoyage(cleaned, info);
    case 'openai': return await _embedOpenAI(cleaned, info);
    case 'mock':   return _embedMock(cleaned);
  }
}

async function embed(text) {
  const [v] = await embedBatch([text]);
  return v;
}

// Float32Array ↔ Buffer (SQLite BLOB)
function toBlob(float32Array) {
  return Buffer.from(float32Array.buffer, float32Array.byteOffset, float32Array.byteLength);
}
function fromBlob(buf, dim = null) {
  if (!buf) return null;
  const arr = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
  return dim && arr.length !== dim ? null : arr;
}

// cosine 유사도 — 같은 차원 가정, L2 정규화 안 되어 있어도 동작
function cosine(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d ? dot / d : 0;
}

function getProviderInfo() {
  return { provider: PROVIDER, ...getInfo() };
}

module.exports = { embed, embedBatch, toBlob, fromBlob, cosine, getProviderInfo };
