// 處理 CORS 預檢請求和 POST 請求
export async function onRequest(context) {
  const { request } = context;

  // 設定 CORS 標頭
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // 在生產環境中建議指定更嚴格的來源
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // 回應 OPTIONS 預檢請求
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // 處理 POST 請求
  if (request.method === 'POST') {
    // 從環境變數中安全地獲取 API Key
    // 這裡我們假設儲存的是 OpenRouter 的 API Key
    const apiKey = context.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      console.error("DEEPSEEK_API_KEY (for OpenRouter) not found in context.env.");
      return new Response(JSON.stringify({ error: 'API key not configured in Cloudflare Pages settings.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    try {
      const openRouterApiKey = apiKey; 
      let requestBody = await request.json();

      // 將模型名稱替換為 OpenRouter 指定的名稱
      // 將模型名稱替換為 OpenRouter 指定的免費模型
      requestBody.model = 'deepseek/deepseek-chat-v3-0324:free';

      const fetchOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openRouterApiKey}`,
          'HTTP-Referer': 'https://speed-reader.6156150.xyz', // 建議替換為您的網站 URL
          'X-Title': 'Speed Reader', // 建議替換為您的網站名稱
        },
        body: JSON.stringify(requestBody),
      };

      const openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
      
      console.log(`[${new Date().toISOString()}] Forwarding request to OpenRouter.`);
      
      const apiResponse = await fetch(openRouterUrl, fetchOptions);

      console.log(`[${new Date().toISOString()}] Received response from OpenRouter with status: ${apiResponse.status}`);

      // 直接將 OpenRouter 的回應（無論成功或失敗）回傳給前端
      return new Response(apiResponse.body, {
        status: apiResponse.status,
        headers: {
          ...corsHeaders,
          'Content-Type': apiResponse.headers.get('Content-Type') || 'application/json',
        },
      });

    } catch (error) {
      console.error('Error in OpenRouter proxy function:', error);
      const errorResponse = {
        error: 'Internal Server Error in proxy function',
        message: error.message,
        stack: error.stack,
      };
      return new Response(JSON.stringify(errorResponse), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  // 對於所有其他方法，回傳 405
  return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
}
