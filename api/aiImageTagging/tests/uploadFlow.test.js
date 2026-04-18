// Integration tests for the upload-image API using fetch and API_URL env var.
// These tests call the running endpoint specified by `API_URL`.

const fetch = globalThis.fetch || (() => {
	try { return require('node-fetch'); } catch { return null; }
})();

// Default to the deployed API endpoint if `API_URL` isn't provided.
const API_URL = process.env.API_URL || 'https://6iy1nvu4cl.execute-api.us-east-1.amazonaws.com';

describe('Upload API integration (via API_URL)', () => {
	it('returns a presigned upload URL and key', async () => {
		const url = new URL('/upload-image', API_URL).toString();
		const res = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ fileName: 'photo.jpg', fileType: 'image/jpeg' }),
		});

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.data).toBeDefined();
		expect(typeof body.data.uploadURL).toBe('string');
		expect(typeof body.data.key).toBe('string');

		// Ensure uploadURL parses as a URL
		expect(() => new URL(body.data.uploadURL)).not.toThrow();
	}, 10000);

	it('returns 400 for missing fileName', async () => {
		const url = new URL('/upload-image', API_URL).toString();
		const res = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ fileName: '' }),
		});

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.success).toBe(false);
	});

	it('returns 400 for invalid content-type', async () => {
		const url = new URL('/upload-image', API_URL).toString();
		const res = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ fileName: 'photo.jpg', fileType: 'application/octet-stream' }),
		});

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.success).toBe(false);
	});
});


// Endpoints used by these tests (for reference):
// POST - https://6iy1nvu4cl.execute-api.us-east-1.amazonaws.com/upload-image
// GET  - https://6iy1nvu4cl.execute-api.us-east-1.amazonaws.com/images/{fileName+}