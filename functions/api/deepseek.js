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
    // 這是最終的、最防禦性的寫法，應對所有可能的平台行為
    const apiKey = context.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      console.error("DEEPSEEK_API_KEY not found in context.env.");
      return new Response(JSON.stringify({ error: 'API key not configured in Cloudflare Pages settings.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    try {
      const requestBody = await request.json();
      
      const fetchOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      };

      // 代理請求到 DeepSeek API
      const apiResponse = await fetch('https://api.deepseek.com/v1/chat/completions', fetchOptions);

      // 檢查來自 DeepSeek API 的回應是否成功
      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error(`Error from DeepSeek API: ${apiResponse.status} ${apiResponse.statusText}`, errorText);
        return new Response(JSON.stringify({ error: `DeepSeek API Error: ${errorText}` }), { 
          status: apiResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // 如果成功，將回應串流回傳給前端
      return new Response(apiResponse.body, {
        status: apiResponse.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });

    } catch (error) {
      console.error('Error in proxy function:', error);
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
