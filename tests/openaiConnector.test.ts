import { describe, expect, it, vi } from 'vitest';
import { sendChatMessage } from '../src/connectors/openaiConnector';

vi.mock('openai', () => {
  return {
    OpenAI: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn(async (params) => ({
            id: 'test-id',
            object: 'chat.completion',
            created: Date.now(),
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: 'Hello, world!' },
                finish_reason: 'stop',
              },
            ],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          })),
        },
      },
    })),
  };
});

describe('sendChatMessage', () => {
  const apiKey = 'test-key';

  it('returns MCPResponse on success', async () => {
    const request = {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user' as const, content: 'Hello?' },
      ],
    };
    const result = await sendChatMessage(request, apiKey);
    if (result.success === true) {
      expect(result.data).toBeDefined();
      // Assert result.data is defined before accessing properties
      if (result.data) {
        expect(result.data.choices).toBeDefined();
        if (
          result.data.choices &&
          result.data.choices.length > 0 &&
          result.data.choices[0] &&
          result.data.choices[0].message
        ) {
          expect(result.data.choices[0].message.content).toBe('Hello, world!');
        }
      }
    } else {
      throw new Error('Expected MCPResponse, got MCPError');
    }
  });

  it('throws MCPError on invalid input', async () => {
    try {
      await sendChatMessage({ model: '', messages: [] }, apiKey);
      throw new Error('Expected MCPError to be thrown');
    } catch (err) {
      if (err && typeof err === 'object' && 'name' in err) {
        expect((err as any).name).toBe('MCPError');
      } else {
        throw err;
      }
    }
  });

  it('returns MCPError on OpenAI API error', async () => {
    // Get the OpenAI mock instance
    const openaiModule = require('openai');
    const openaiInstance = new openaiModule.OpenAI('test-key');
    const createSpy = vi.spyOn(openaiInstance.chat.completions, 'create')
      .mockImplementationOnce(async () => { throw new Error('API failure'); });

    // Patch sendChatMessage to use our instance (if needed)
    const request = {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user' as const, content: 'Hello?' },
      ],
    };
    const result = await sendChatMessage(request, apiKey);
    if (result.success === false) {
      expect(result.error).toContain('API failure');
    } else {
      throw new Error('Expected MCPError, got MCPResponse');
    }

    createSpy.mockRestore();
  });
});
