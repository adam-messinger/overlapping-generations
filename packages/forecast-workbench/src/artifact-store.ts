import { randomUUID } from 'node:crypto';
import {
  access,
  mkdir,
  open,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  canonicalBytes,
  canonicalJson,
  sha256Hex,
  sha256Id,
} from './canonical.js';
import type { DataClassification } from './contracts.js';

export interface StoredArtifact {
  id: string;
  algorithm: 'sha256';
  digest: string;
  bytes: number;
  mediaType: string;
  classification: DataClassification;
}

function digestFromId(id: string): string {
  const match = /^sha256:([a-f0-9]{64})$/.exec(id);
  if (!match) throw new Error(`Invalid artifact ID '${id}'`);
  return match[1];
}

export class FileArtifactStore {
  readonly objectsRoot: string;

  constructor(readonly root: string) {
    this.objectsRoot = join(root, 'objects', 'sha256');
  }

  async initialize(): Promise<void> {
    await mkdir(this.objectsRoot, { recursive: true, mode: 0o700 });
  }

  pathFor(id: string): string {
    const digest = digestFromId(id);
    return join(this.objectsRoot, digest.slice(0, 2), digest.slice(2));
  }

  async put(
    value: string | Uint8Array,
    options: {
      mediaType?: string;
      classification?: DataClassification;
    } = {},
  ): Promise<StoredArtifact> {
    await this.initialize();
    const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
    const digest = sha256Hex(bytes);
    const id = sha256Id(bytes);
    const target = this.pathFor(id);
    await mkdir(dirname(target), { recursive: true, mode: 0o700 });
    try {
      await access(target);
    } catch {
      const temporary = `${target}.tmp-${process.pid}-${randomUUID()}`;
      const handle = await open(temporary, 'wx', 0o600);
      try {
        await handle.writeFile(bytes);
        await handle.sync();
      } finally {
        await handle.close();
      }
      try {
        await rename(temporary, target);
      } catch (error) {
        await unlink(temporary).catch(() => undefined);
        try {
          await access(target);
        } catch {
          throw error;
        }
      }
      const directory = await open(dirname(target), 'r').catch(() => undefined);
      if (directory) {
        try {
          await directory.sync();
        } finally {
          await directory.close();
        }
      }
    }
    const metadata = await stat(target);
    if (metadata.size !== bytes.byteLength) {
      throw new Error(`Artifact '${id}' has an unexpected stored length`);
    }
    const storedDigest = sha256Hex(new Uint8Array(await readFile(target)));
    if (storedDigest !== digest) {
      throw new Error(
        `Artifact '${id}' has invalid stored content sha256:${storedDigest}`,
      );
    }
    return {
      id,
      algorithm: 'sha256',
      digest,
      bytes: bytes.byteLength,
      mediaType: options.mediaType ?? 'application/octet-stream',
      classification: options.classification ?? 'internal',
    };
  }

  async putCanonical(
    value: unknown,
    options: {
      classification?: DataClassification;
      pretty?: boolean;
    } = {},
  ): Promise<StoredArtifact> {
    return this.put(
      options.pretty ? `${canonicalJson(value, 2)}\n` : canonicalBytes(value),
      {
        mediaType: 'application/json',
        classification: options.classification,
      },
    );
  }

  async putFile(
    path: string,
    options: {
      mediaType?: string;
      classification?: DataClassification;
    } = {},
  ): Promise<StoredArtifact> {
    return this.put(new Uint8Array(await readFile(path)), options);
  }

  async get(id: string): Promise<Uint8Array> {
    return new Uint8Array(await readFile(this.pathFor(id)));
  }

  async getText(id: string): Promise<string> {
    return new TextDecoder().decode(await this.get(id));
  }

  async getJson<T = unknown>(id: string): Promise<T> {
    return JSON.parse(await this.getText(id)) as T;
  }

  async has(id: string): Promise<boolean> {
    try {
      await access(this.pathFor(id));
      return true;
    } catch {
      return false;
    }
  }

  async verify(id: string): Promise<void> {
    const expected = digestFromId(id);
    const raw = await this.get(id);
    const actual = sha256Hex(raw);
    if (actual !== expected) {
      throw new Error(`Artifact integrity failure for '${id}': computed sha256:${actual}`);
    }
  }

  async writeCopy(id: string, destination: string): Promise<void> {
    const raw = await this.get(id);
    const actual = sha256Hex(raw);
    const expected = digestFromId(id);
    if (actual !== expected) {
      throw new Error(
        `Artifact integrity failure for '${id}': computed sha256:${actual}`,
      );
    }
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, raw, { mode: 0o600 });
  }
}
