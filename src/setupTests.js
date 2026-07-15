import '@testing-library/jest-dom';
import React from 'react';
import { vi } from 'vitest';
import { MessageChannel, MessagePort } from 'node:worker_threads';
import { TextEncoder, TextDecoder } from 'node:util';
import { ReadableStream } from 'node:stream/web';
import { fetch, Headers, Request, Response } from 'undici';
import { terminate } from 'firebase/firestore';
import { db } from './config/data/firebase';

globalThis.jest = vi;
globalThis.MessageChannel = MessageChannel;
globalThis.MessagePort = MessagePort;
globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder;
globalThis.ReadableStream = ReadableStream;
globalThis.fetch = fetch;
globalThis.Headers = Headers;
globalThis.Request = Request;
globalThis.Response = Response;

globalThis.matchMedia = globalThis.matchMedia || (() => ({
  matches: false,
  addListener() {},
  removeListener() {},
}));

vi.mock('axios', () => {
  const mockAxios = {
    create: vi.fn(() => mockAxios),
    get: vi.fn(() => Promise.resolve({ data: {} })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() },
    },
    defaults: { headers: { common: {} } },
  };
  return { default: mockAxios };
});

vi.mock('lottie-react', () => ({
  default: () => React.createElement('div', { 'data-testid': 'lottie-mock' }),
}));

vi.mock('pdfjs-dist/webpack.mjs', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: vi.fn(() => ({
    promise: Promise.resolve({
      numPages: 1,
      getPage: vi.fn(() => Promise.resolve({
        getViewport: vi.fn(() => ({ width: 100, height: 100 })),
        render: vi.fn(() => ({ promise: Promise.resolve() })),
      })),
    }),
  })),
}));

vi.mock('@daily-co/daily-js', () => ({
  default: {
    createCallObject: vi.fn(() => ({
      join: vi.fn(() => Promise.resolve()),
      leave: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      participants: vi.fn(() => ({})),
    })),
  },
}));

vi.mock('firebase/analytics', () => ({
  getAnalytics: vi.fn(() => ({})),
  isSupported: vi.fn(() => Promise.resolve(false)),
}));

afterAll(async () => {
  await terminate(db);
});
