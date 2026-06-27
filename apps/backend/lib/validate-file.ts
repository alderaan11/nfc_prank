// MP4 magic bytes: ftyp box at offset 4
// Signature: bytes[4..7] === 0x66 0x74 0x79 0x70 ("ftyp")
const MP4_MAGIC = Buffer.from([0x66, 0x74, 0x79, 0x70]);
const MAX_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB

export function validateMp4Magic(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  return buffer.subarray(4, 8).equals(MP4_MAGIC);
}

export function validateFileSize(sizeBytes: number): boolean {
  return sizeBytes > 0 && sizeBytes <= MAX_SIZE_BYTES;
}

export const MAX_SIZE_BYTES_EXPORT = MAX_SIZE_BYTES;
