// src/setupTests.js
import '@testing-library/jest-dom';

// 1. Setup Environment Polyfills FIRST
const { MessageChannel, MessagePort } = require('node:worker_threads');
globalThis.MessageChannel = MessageChannel;
globalThis.MessagePort = MessagePort;

const { TextEncoder, TextDecoder } = require('node:util');
globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder;

const { ReadableStream } = require('node:stream/web');
globalThis.ReadableStream = ReadableStream;

// 2. Now it is safe to require libraries that depend on them
const undici = require('undici');
globalThis.fetch = undici.fetch;
globalThis.Headers = undici.Headers;
globalThis.Request = undici.Request;
globalThis.Response = undici.Response;

// ... rest of your file (mocks, etc.)
globalThis.matchMedia =
	globalThis.matchMedia ||
	function () {
		return {
			matches: false,
			addListener: function () {},
			removeListener: function () {},
		};
	};

jest.mock('axios', () => {
	// ... your axios mock
	const mockAxios = {
		create: jest.fn(() => mockAxios),
		get: jest.fn(() => Promise.resolve({ data: {} })),
		post: jest.fn(() => Promise.resolve({ data: {} })),
		put: jest.fn(() => Promise.resolve({ data: {} })),
		delete: jest.fn(() => Promise.resolve({ data: {} })),
		interceptors: {
			request: { use: jest.fn(), eject: jest.fn() },
			response: { use: jest.fn(), eject: jest.fn() },
		},
		defaults: { headers: { common: {} } },
	};
	return mockAxios;
});

jest.mock('lottie-react', () => ({
	__esModule: true,
	default: () => <div data-testid='lottie-mock' />,
}));

// Mock PDF.js with explicit return statements to prevent 'undefined' errors
jest.mock('pdfjs-dist/webpack.mjs', () => {
	return {
		__esModule: true,
		GlobalWorkerOptions: {
			workerSrc: '',
		},
		getDocument: jest.fn(function () {
			// Explicitly return the object expected by your code
			return {
				promise: Promise.resolve({
					numPages: 1,
					getPage: jest.fn(function () {
						return Promise.resolve({
							getViewport: jest.fn(() => ({ width: 100, height: 100 })),
							render: jest.fn(() => ({ promise: Promise.resolve() })),
						});
					}),
				}),
			};
		}),
	};
});

jest.mock('@daily-co/daily-js', () => ({
	__esModule: true,
	default: {
		createCallObject: jest.fn(() => ({
			join: jest.fn(() => Promise.resolve()),
			leave: jest.fn(),
			on: jest.fn(),
			off: jest.fn(),
			participants: jest.fn(() => ({})),
		})),
	},
}));

jest.mock('firebase/analytics', () => ({
	getAnalytics: jest.fn(() => ({})),
	isSupported: jest.fn(() => Promise.resolve(false)),
}));

const { db } = require('./config/data/firebase');
const { terminate } = require('firebase/firestore');

afterAll(async () => {
	await terminate(db);
});
