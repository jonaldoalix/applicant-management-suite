import { generate6DigitNumber, generateSecurePin, unsubscribeLink, generateUploadLink, validateRequest, validatePin, validateLink, capitalize, convertPDFBlobToImages, createBlobUrl, revokeBlobUrl } from './Constants';
import { getConfigFromDb } from './data/firebase';
import CryptoJS from 'crypto-js';
// FIX 1: Import from the exact same path as the source file so they share the mock
import * as pdfjsLib from 'pdfjs-dist/webpack.mjs';

// Mock dependencies
jest.mock('./data/firebase', () => ({
	getConfigFromDb: jest.fn(),
}));

jest.mock('crypto-js', () => ({
	__esModule: true,
	default: {
		HmacSHA256: jest.fn(),
	},
}));

// FIX 2: Mock the specific webpack path used in Constants.js
jest.mock('pdfjs-dist/webpack.mjs', () => ({
	__esModule: true,
	GlobalWorkerOptions: { workerSrc: '' },
	getDocument: jest.fn(),
}));

// Mock return value for getConfigFromDb
const mockGetConfigFromDb = getConfigFromDb;
// FIX 3: Grab the mocked function from the module namespace
const mockGetDocument = pdfjsLib.getDocument;

describe('Constants.js', () => {
	beforeEach(() => {
		// Clear all mocks
		jest.clearAllMocks();

		mockGetConfigFromDb.mockResolvedValue({
			PIN_KEY: 'mock_pin_key',
			UNSUB_KEY: 'mock_unsub_key',
			UPLOAD_KEY: 'mock_upload_key',
		});

		CryptoJS.HmacSHA256.mockImplementation((message, key) => ({
			toString: () => `hashed(${message}, ${key})`,
		}));

		global.btoa = jest.fn((str) => `b64(${str})`);
		global.atob = jest.fn((str) => {
			if (typeof str !== 'string' || !str.startsWith('b64(')) return '';
			return str.replace('b64(', '').replace(')', '');
		});
		global.URL.createObjectURL = jest.fn(() => 'blob:http://mock.url/12345');
		global.URL.revokeObjectURL = jest.fn();
	});

	it('generate6DigitNumber should return a 6-digit string', () => {
		const pin = generate6DigitNumber();
		expect(pin).toHaveLength(6);
		expect(typeof pin).toBe('string');
		expect(/^[0-9]{6}$/.test(pin)).toBe(true);
	});

	it('generateSecurePin should hash and encode the pin', async () => {
		const pin = '123456';
		const result = await generateSecurePin(pin);
		expect(CryptoJS.HmacSHA256).toHaveBeenCalledWith('123456', 'mock_pin_key');
		expect(global.btoa).toHaveBeenCalledWith('123456:hashed(123456, mock_pin_key)');
		expect(result).toBe('b64(123456:hashed(123456, mock_pin_key))');
	});

	it('unsubscribeLink should hash and encode the id', async () => {
		const id = 'user123';
		const result = await unsubscribeLink(id);
		expect(CryptoJS.HmacSHA256).toHaveBeenCalledWith('user123', 'mock_unsub_key');
		expect(global.btoa).toHaveBeenCalledWith('user123:hashed(user123, mock_unsub_key)');
		expect(result).toContain('b64(user123:hashed(user123, mock_unsub_key))');
	});

	it('generateUploadLink should hash and encode the requestID', async () => {
		const id = 'req123';
		const result = await generateUploadLink(id);
		expect(CryptoJS.HmacSHA256).toHaveBeenCalledWith('req123', 'mock_upload_key');
		expect(global.btoa).toHaveBeenCalledWith('req123:hashed(req123, mock_upload_key)');
		expect(result).toContain('b64(req123:hashed(req123, mock_upload_key))');
	});

	it('validateRequest should correctly validate a token', async () => {
		const token = 'b64(req123:hashed(req123, mock_upload_key))';
		const result = await validateRequest(token);
		expect(global.atob).toHaveBeenCalledWith(token);
		expect(CryptoJS.HmacSHA256).toHaveBeenCalledWith('req123', 'mock_upload_key');
		expect(result).toEqual({ result: true, id: 'req123' });
	});

	it('validatePin should correctly validate a pin', async () => {
		const pin = 'b64(123456:hashed(123456, mock_pin_key))';
		const result = await validatePin(pin);
		expect(global.atob).toHaveBeenCalledWith(pin);
		expect(CryptoJS.HmacSHA256).toHaveBeenCalledWith('123456', 'mock_pin_key');
		expect(result).toBe(true);
	});

	it('validateLink should correctly validate a link', async () => {
		const link = 'b64(user123:hashed(user123, mock_unsub_key))';
		const result = await validateLink(link);
		expect(global.atob).toHaveBeenCalledWith(link);
		expect(CryptoJS.HmacSHA256).toHaveBeenCalledWith('user123', 'mock_unsub_key');
		expect(result).toEqual({ result: true, id: 'user123' });
	});

	it('capitalize should work correctly', () => {
		expect(capitalize('hello')).toBe('Hello');
		expect(capitalize('WORLD')).toBe('WORLD');
		expect(capitalize('')).toBe('');
		expect(capitalize(null)).toBe('');
	});

	it('createBlobUrl and revokeBlobUrl should call URL methods', () => {
		const blob = new Blob();
		const url = createBlobUrl(blob);
		expect(url).toBe('blob:http://mock.url/12345');
		expect(global.URL.createObjectURL).toHaveBeenCalledWith(blob);

		revokeBlobUrl(url);
		expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(url);
	});

	it('convertPDFBlobToImages should process a PDF', async () => {
		const mockPage = {
			getViewport: jest.fn(() => ({ height: 100, width: 100 })),
			render: jest.fn(() => ({ promise: Promise.resolve() })),
		};
		const mockPdf = {
			numPages: 2,
			getPage: jest.fn(() => Promise.resolve(mockPage)),
		};

		// This now targets the CORRECT mocked function
		mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockPdf) });

		// Mock canvas
		global.document.createElement = jest.fn(() => ({
			getContext: () => ({}),
			toDataURL: () => 'data:image/png;base64,mockimagedata',
		}));

		const blob = new Blob(['%PDF-1.5'], { type: 'application/pdf' });
		const images = await convertPDFBlobToImages(blob);

		expect(global.URL.createObjectURL).toHaveBeenCalledWith(blob);
		expect(mockGetDocument).toHaveBeenCalledWith('blob:http://mock.url/12345');
		expect(mockPdf.getPage).toHaveBeenCalledTimes(2);
		expect(mockPage.render).toHaveBeenCalledTimes(2);
		expect(images).toEqual(['data:image/png;base64,mockimagedata', 'data:image/png;base64,mockimagedata']);
		expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://mock.url/12345');
	});
});
