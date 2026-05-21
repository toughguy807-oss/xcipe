const fs = require('fs');

function getImageSize(absPath) {
  if (!fs.existsSync(absPath)) return null;
  const buf = fs.readFileSync(absPath);
  if (buf.length < 24) return null;
  const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
  if (isPng) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  const isJpg = buf[0] === 0xFF && buf[1] === 0xD8;
  if (isJpg) {
    let i = 2;
    while (i < buf.length) {
      if (buf[i] !== 0xFF) return null;
      const marker = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
        return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      }
      i += 2 + len;
    }
  }
  return null;
}

module.exports = { getImageSize };
