import { readFile, stat } from 'node:fs/promises';
import { resolve as resolvePath } from 'node:path';
import { pathToFileURL } from 'node:url';
import type {
  DataRequest,
  DataRequestValue,
  DataResolver,
  DataSourceDefinition,
  ResolvedData,
} from './data.js';

export interface HttpDataRequest {
  url: string;
  query?: Readonly<Record<string, DataRequestValue>>;
  publicHeaders?: Readonly<Record<string, string>>;
  credentialsRef?: string;
}

export function httpDataResolver<TValue>(options: {
  id: string;
  version: string;
  source: DataSourceDefinition;
  parse: (
    raw: Uint8Array,
    metadata: { mediaType: string; url: string },
  ) => TValue | Promise<TValue>;
  schema?: unknown;
  /** Resolve a named credential without ever serializing it into a request record. */
  credentialProvider?: (reference: string) =>
    Readonly<Record<string, string>> | Promise<Readonly<Record<string, string>>>;
}): DataResolver<HttpDataRequest, TValue> {
  return {
    id: options.id,
    version: options.version,
    source: options.source,
    canonicalize: (request): DataRequest => ({
      uri: request.url,
      method: 'GET',
      ...(request.query ? { query: request.query } : {}),
      ...(request.publicHeaders ? { publicHeaders: request.publicHeaders } : {}),
      ...(request.credentialsRef ? { credentialsRef: request.credentialsRef } : {}),
    }),
    resolve: async (request): Promise<ResolvedData<TValue>> => {
      const url = new URL(request.url);
      for (const [name, value] of Object.entries(request.query ?? {})) {
        url.searchParams.delete(name);
        for (const item of Array.isArray(value) ? value : [value]) {
          url.searchParams.append(name, String(item));
        }
      }
      const credentialHeaders = request.credentialsRef
        ? await options.credentialProvider?.(request.credentialsRef)
        : undefined;
      if (request.credentialsRef && !credentialHeaders) {
        throw new Error(
          `HTTP resolver '${options.id}' has no credential provider for '${request.credentialsRef}'`,
        );
      }
      const response = await fetch(url, {
        headers: {
          ...(request.publicHeaders ?? {}),
          ...(credentialHeaders ?? {}),
        },
      });
      if (!response.ok) {
        throw new Error(
          `HTTP resolver '${options.id}' received ${response.status} ${response.statusText}`,
        );
      }
      const raw = new Uint8Array(await response.arrayBuffer());
      const mediaType = response.headers.get('content-type')?.split(';')[0]?.trim() ||
        'application/octet-stream';
      const value = await options.parse(raw, { mediaType, url: response.url });
      return {
        raw,
        value,
        mediaType,
        schema: options.schema,
        response: {
          status: response.status,
          ...(response.headers.get('etag') ? { etag: response.headers.get('etag')! } : {}),
          ...(response.headers.get('last-modified')
            ? { lastModified: response.headers.get('last-modified')! }
            : {}),
          ...(response.headers.get('content-location')
            ? { contentLocation: response.headers.get('content-location')! }
            : {}),
        },
        artifactLocator: response.url,
      };
    },
  };
}

export interface FileDataRequest {
  path: string;
}

export function fileDataResolver<TValue>(options: {
  id: string;
  version: string;
  source: DataSourceDefinition;
  parse: (raw: Uint8Array, path: string) => TValue | Promise<TValue>;
  mediaType?: string;
  schema?: unknown;
}): DataResolver<FileDataRequest, TValue> {
  return {
    id: options.id,
    version: options.version,
    source: options.source,
    canonicalize: (request) => {
      const path = resolvePath(request.path);
      return {
        uri: pathToFileURL(path).href,
        method: 'GET',
      };
    },
    resolve: async (request) => {
      const path = resolvePath(request.path);
      const [buffer, metadata] = await Promise.all([readFile(path), stat(path)]);
      const raw = new Uint8Array(buffer);
      return {
        raw,
        value: await options.parse(raw, path),
        mediaType: options.mediaType ?? 'application/octet-stream',
        schema: options.schema,
        response: {
          lastModified: metadata.mtime.toISOString(),
          contentLocation: pathToFileURL(path).href,
        },
        artifactLocator: path,
      };
    },
  };
}
