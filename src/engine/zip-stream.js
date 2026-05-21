// 외부 의존성 없는 ZIP 스트림 라이터 (PKZIP appnote 6.3.4 호환 부분 집합)
// 지원: STORE/DEFLATE, UTF-8 파일명 (general purpose bit 11), no encryption, no zip64
// 32-bit 크기 제한이 있으나 산출물 다운로드 용도로 충분.
const zlib = require('zlib');

const SIG_LFH = 0x04034b50;  // Local File Header
const SIG_CDH = 0x02014b50;  // Central Directory Header
const SIG_EOCD = 0x06054b50; // End of Central Directory

// CRC-32 lookup table (IEEE polynomial)
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// DOS time/date 인코딩 (yyyyMMddHHmmss → 2바이트씩)
function dosTime(d) {
  return ((d.getHours() & 0x1f) << 11) | ((d.getMinutes() & 0x3f) << 5) | ((d.getSeconds() / 2) & 0x1f);
}
function dosDate(d) {
  return (((d.getFullYear() - 1980) & 0x7f) << 9) | (((d.getMonth() + 1) & 0x0f) << 5) | (d.getDate() & 0x1f);
}

class ZipStream {
  constructor(res) {
    this.res = res;
    this.entries = [];
    this.offset = 0;
  }

  _write(buf) {
    this.res.write(buf);
    this.offset += buf.length;
  }

  // 단일 파일 추가. content는 Buffer.
  addFile(name, content, mtime = new Date()) {
    const nameBuf = Buffer.from(name, 'utf8');
    const crc = crc32(content);
    const uncompSize = content.length;

    let method = 0; // STORE
    let data = content;
    if (uncompSize > 0) {
      const deflated = zlib.deflateRawSync(content, { level: zlib.constants.Z_DEFAULT_COMPRESSION });
      if (deflated.length < uncompSize) { method = 8; data = deflated; }
    }
    const compSize = data.length;
    const time = dosTime(mtime);
    const date = dosDate(mtime);

    // Local file header (30 + name)
    const lfh = Buffer.alloc(30);
    lfh.writeUInt32LE(SIG_LFH, 0);
    lfh.writeUInt16LE(20, 4);          // version needed
    lfh.writeUInt16LE(0x0800, 6);      // GP bit 11 = UTF-8 filename
    lfh.writeUInt16LE(method, 8);
    lfh.writeUInt16LE(time, 10);
    lfh.writeUInt16LE(date, 12);
    lfh.writeUInt32LE(crc, 14);
    lfh.writeUInt32LE(compSize, 18);
    lfh.writeUInt32LE(uncompSize, 22);
    lfh.writeUInt16LE(nameBuf.length, 26);
    lfh.writeUInt16LE(0, 28);          // extra length

    const localOffset = this.offset;
    this._write(lfh);
    this._write(nameBuf);
    this._write(data);

    this.entries.push({ name: nameBuf, method, time, date, crc, compSize, uncompSize, localOffset });
  }

  // 모든 파일 추가 후 호출. central directory + EOCD 기록 후 res.end().
  finish() {
    const cdStart = this.offset;
    for (const e of this.entries) {
      const cdh = Buffer.alloc(46);
      cdh.writeUInt32LE(SIG_CDH, 0);
      cdh.writeUInt16LE(20, 4);          // version made by
      cdh.writeUInt16LE(20, 6);          // version needed
      cdh.writeUInt16LE(0x0800, 8);      // GP bit 11
      cdh.writeUInt16LE(e.method, 10);
      cdh.writeUInt16LE(e.time, 12);
      cdh.writeUInt16LE(e.date, 14);
      cdh.writeUInt32LE(e.crc, 16);
      cdh.writeUInt32LE(e.compSize, 20);
      cdh.writeUInt32LE(e.uncompSize, 24);
      cdh.writeUInt16LE(e.name.length, 28);
      cdh.writeUInt16LE(0, 30);          // extra length
      cdh.writeUInt16LE(0, 32);          // comment length
      cdh.writeUInt16LE(0, 34);          // disk #
      cdh.writeUInt16LE(0, 36);          // internal attrs
      cdh.writeUInt32LE(0, 38);          // external attrs
      cdh.writeUInt32LE(e.localOffset, 42);
      this._write(cdh);
      this._write(e.name);
    }
    const cdSize = this.offset - cdStart;
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(SIG_EOCD, 0);
    eocd.writeUInt16LE(0, 4);            // disk #
    eocd.writeUInt16LE(0, 6);            // disk start cd
    eocd.writeUInt16LE(this.entries.length, 8);
    eocd.writeUInt16LE(this.entries.length, 10);
    eocd.writeUInt32LE(cdSize, 12);
    eocd.writeUInt32LE(cdStart, 16);
    eocd.writeUInt16LE(0, 20);           // comment length
    this._write(eocd);
    this.res.end();
  }
}

module.exports = { ZipStream };
