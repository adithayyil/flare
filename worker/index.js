/**
 * Cloudflare Worker - LLM Proxy
 *
 * Routes requests from React Native app to HuggingFace's gpt-oss-120b endpoint
 * without exposing the HF API key.
 */

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Only accept POST to /chat/completions
    if (request.method !== 'POST' || !request.url.endsWith('/chat/completions')) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      // Parse incoming request
      const body = await request.json();
      const { messages, temperature = 0.7, max_tokens = 150 } = body;

      if (!messages || !Array.isArray(messages)) {
        return new Response(
          JSON.stringify({ error: 'Invalid request: messages array required' }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }

      // Forward to HuggingFace endpoint with fallback
      const apiKey = env.HF_API_KEY || 'test';
      const endpoints = [
        'https://qyt7893blb71b5d3.us-east-2.aws.endpoints.huggingface.cloud/v1/chat/completions',
        'https://vjioo4r1vyvcozuj.us-east-2.aws.endpoints.huggingface.cloud/v1/chat/completions',
      ];

      let hfResponse;
      let lastError;

      for (const endpoint of endpoints) {
        try {
          hfResponse = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              messages,
              temperature,
              max_tokens,
            }),
          });

          if (hfResponse.ok) break;

          lastError = await hfResponse.text();
          console.error(`Endpoint failed (${hfResponse.status}): ${endpoint}`);
          hfResponse = null;
        } catch (err) {
          console.error(`Endpoint unreachable: ${endpoint}`, err.message);
          lastError = err.message;
          hfResponse = null;
        }
      }

      if (!hfResponse) {
        return new Response(
          JSON.stringify({
            error: 'LLM service error',
            details: (lastError || 'All endpoints failed').substring(0, 200)
          }),
          {
            status: 502,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }

      // Return OpenAI-compatible response
      const data = await hfResponse.json();
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          message: error.message
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
  },
};
