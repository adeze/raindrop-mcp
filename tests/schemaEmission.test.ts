import { describe, expect, it } from 'vitest';
import { RaindropMCPService } from '../src/services/raindropmcp.service';

describe('Tool schema emission', () => {
	let service: RaindropMCPService;

	beforeAll(() => {
		service = new RaindropMCPService();
	});

	it('should emit tools with non-empty descriptions and valid schemas', async () => {
		const tools = await service.listTools();
		expect(Array.isArray(tools)).toBe(true);
		expect(tools.length).toBeGreaterThan(0);

		for (const tool of tools) {
			expect(typeof tool.description).toBe('string');
			expect(tool.description.trim()).not.toBe('');
			// Check inputSchema and outputSchema are valid Zod schemas or objects
			expect(tool.inputSchema).toBeDefined();
			expect(tool.outputSchema).toBeDefined();
			// Optionally, check that inputSchema and outputSchema are objects
			expect(typeof tool.inputSchema).toBe('object');
			expect(typeof tool.outputSchema).toBe('object');
		}
	});

	it('should not allow blank or whitespace-only tool descriptions', async () => {
		const tools = await service.listTools();
		for (const tool of tools) {
			expect(tool.description).toBeDefined();
			expect(typeof tool.description).toBe('string');
			// Should not be empty or whitespace-only
			expect(tool.description.trim()).not.toBe('');
		}
	});

	it('should fail if any tool description is missing', async () => {
		const tools = await service.listTools();
		for (const tool of tools) {
			// Description must exist and be a string
			expect(tool).toHaveProperty('description');
			expect(typeof tool.description).toBe('string');
		}
	});

	it('should fail if any tool description is less than 5 characters', async () => {
		const tools = await service.listTools();
		for (const tool of tools) {
			expect(tool.description.trim().length).toBeGreaterThanOrEqual(5);
		}
	});
});