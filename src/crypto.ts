// ============================================================
// 账号密码加密：PBKDF2 派生密钥 + AES-GCM
// ============================================================
//
// 定位很重要：这层加密防的是「别人顺手点开你的浏览器看见你的学习记录」，
// 不是防能完整读取你设备存储、又愿意花算力爆破的人。
// 没有服务器意味着忘记密码就无法重置——密钥完全由密码派生。

const KDF_ITERATIONS = 250_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

/** 密文信封。明文 AppData 序列化后加密存入 ct。 */
export interface Envelope {
  v: 1;
  iv: string;
  ct: string;
}

export function isEnvelope(value: unknown): value is Envelope {
  return (
    typeof value === 'object' && value !== null &&
    (value as Envelope).v === 1 &&
    typeof (value as Envelope).iv === 'string' &&
    typeof (value as Envelope).ct === 'string'
  );
}

// --- base64 与字节互转 ---
function toBase64(bytes: Uint8Array<ArrayBuffer>): string {
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

// 显式用 ArrayBuffer 支撑：Web Crypto 的类型要求 ArrayBufferView<ArrayBuffer>，
// 直接推断出来的 ArrayBufferLike 过不了类型检查。
function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text);
  const out = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export function randomSalt(): string {
  return toBase64(crypto.getRandomValues(new Uint8Array(SALT_BYTES)));
}

export const defaultIterations = KDF_ITERATIONS;

/** 由密码与 salt 派生 AES-GCM 密钥。密钥只留在内存，不落盘。 */
export async function deriveKey(
  password: string,
  salt: string,
  iterations: number = KDF_ITERATIONS,
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: fromBase64(salt), iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    // 需要 exportable：会话内记住密钥时要写进 sessionStorage
    true,
    ['encrypt', 'decrypt'],
  );
}

export async function encrypt(key: CryptoKey, plaintext: string): Promise<Envelope> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext),
  );
  return { v: 1, iv: toBase64(iv), ct: toBase64(new Uint8Array(ct)) };
}

/** 解密失败（密码错误或数据损坏）返回 null，由调用方决定怎么提示。 */
export async function decrypt(key: CryptoKey, envelope: Envelope): Promise<string | null> {
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(envelope.iv) }, key, fromBase64(envelope.ct),
    );
    return new TextDecoder().decode(plain);
  } catch {
    // AES-GCM 的认证标签校验失败，说明密码不对或密文被改动过
    return null;
  }
}

// --- 会话内记住密钥（关闭标签页即失效）---

export async function exportKey(key: CryptoKey): Promise<string> {
  return toBase64(new Uint8Array(await crypto.subtle.exportKey('raw', key) as ArrayBuffer));
}

export async function importKey(raw: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw', fromBase64(raw), { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'],
  );
}
