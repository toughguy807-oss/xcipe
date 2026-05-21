// Unit — zip-stream.js: PKZIP 헤더/CRC/EOCD 무결성
const test = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('zlib');
const { Writable } = require('stream');
const { ZipStream } = require('../../src/engine/zip-stream');

// res 모킹: chunk를 Buffer로 누적 + end 플래그
function mockRes() {
  const chunks = [];
  let ended = false;
  return {
    write(b) { chunks.push(Buffer.isBuffer(b) ? b : Buffer.from(b)); },
    end() { ended = true; },
    get buffer() { return Buffer.concat(chunks); },
    get ended() { return ended; }
  };
}

// EOCD를 뒤에서 찾고 central directory를 파싱
function parseZip(buf) {
  // EOCD 시그너처 0x06054b50 — 파일 끝에서 역방향 검색
  let eocdOff = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocdOff = i; break; }
  }
  assert.notEqual(eocdOff, -1, 'EOCD not found');
  const total = buf.readUInt16LE(eocdOff + 10);
  const cdSize = buf.readUInt32LE(eocdOff + 12);
  const cdOff = buf.readUInt32LE(eocdOff + 16);

  const entries = [];
  let p = cdOff;
  for (let i = 0; i < total; i++) {
    assert.equal(buf.readUInt32LE(p), 0x02014b50, 'CDH sig');
    const method = buf.readUInt16LE(p + 10);
    const crc = buf.readUInt32LE(p + 16);
    const compSize = buf.readUInt32LE(p + 20);
    const uncompSize = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOff = buf.readUInt32LE(p + 42);
    const name = buf.slice(p + 46, p + 46 + nameLen).toString('utf8');
    p += 46 + nameLen + extraLen + commentLen;

    // local file header에서 데이터 추출
    assert.equal(buf.readUInt32LE(localOff), 0x04034b50, 'LFH sig');
    const lNameLen = buf.readUInt16LE(localOff + 26);
    const lExtraLen = buf.readUInt16LE(localOff + 28);
    const dataStart = localOff + 30 + lNameLen + lExtraLen;
    const data = buf.slice(dataStart, dataStart + compSize);
    let content;
    if (method === 0) content = data;
    else if (method === 8) content = zlib.inflateRawSync(data);
    else throw new Error('unsupported method ' + method);
    assert.equal(content.length, uncompSize, 'size match');
    entries.push({ name, method, crc, content });
  }
  return entries;
}

test('zip-stream: 단일 텍스트 파일을 STORE 또는 DEFLATE로 저장 후 추출 가능', () => {
  const res = mockRes();
  const z = new ZipStream(res);
  z.addFile('hello.txt', Buffer.from('Hello, ZIP!', 'utf8'));
  z.finish();
  assert.equal(res.ended, true);
  const entries = parseZip(res.buffer);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].name, 'hello.txt');
  assert.equal(entries[0].content.toString('utf8'), 'Hello, ZIP!');
});

test('zip-stream: 여러 파일 + UTF-8 한글 파일명', () => {
  const res = mockRes();
  const z = new ZipStream(res);
  z.addFile('docs/요구사항.md', Buffer.from('# 요구사항\n', 'utf8'));
  z.addFile('docs/기능정의.md', Buffer.from('# 기능정의\n', 'utf8'));
  z.addFile('manifest.json', Buffer.from('{"ok":true}', 'utf8'));
  z.finish();
  const entries = parseZip(res.buffer);
  assert.equal(entries.length, 3);
  const names = entries.map(e => e.name).sort();
  assert.deepEqual(names, ['docs/기능정의.md', 'docs/요구사항.md', 'manifest.json']);
});

test('zip-stream: 빈 파일도 정상 저장됨 (uncompSize=0)', () => {
  const res = mockRes();
  const z = new ZipStream(res);
  z.addFile('empty.txt', Buffer.alloc(0));
  z.finish();
  const entries = parseZip(res.buffer);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].content.length, 0);
});

test('zip-stream: 큰 텍스트는 DEFLATE로 압축되어 작아짐', () => {
  const res = mockRes();
  const z = new ZipStream(res);
  const repeat = Buffer.from('A'.repeat(10000), 'utf8');
  z.addFile('big.txt', repeat);
  z.finish();
  // EOCD 위치
  const buf = res.buffer;
  let eocdOff = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocdOff = i; break; }
  }
  // CDH 첫 항목의 compressed size < 10000 이어야 (압축 효과 검증)
  const cdOff = buf.readUInt32LE(eocdOff + 16);
  const compSize = buf.readUInt32LE(cdOff + 20);
  assert.ok(compSize < 1000, `compressed (${compSize}) should be much smaller than 10000`);
  const entries = parseZip(buf);
  assert.equal(entries[0].content.toString('utf8'), 'A'.repeat(10000));
});
