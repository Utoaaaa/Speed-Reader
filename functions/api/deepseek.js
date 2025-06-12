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
      // 將 API Key 作為 Bearer Token 傳遞。
      // 即使使用 AI Gateway，這種方式也是有效的，Gateway 會將此 header 轉發。
      // 這確保了無論 API Key 儲存在 Pages 環境變數還是 Gateway Credentials 中，請求都能被正確認證。
      const fetchOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      };

      const gatewayUrl = 'https://gateway.ai.cloudflare.com/v1/5df67fbdc8e3dd0cc085b6f25dd15915/deepseek/deepseek/chat/completions';

      let lastError = null;
      const maxRetries = 3;

      for (let i = 0; i < maxRetries; i++) {
        try {
          console.log(`[${new Date().toISOString()}] Attempt ${i + 1} of ${maxRetries}: Forwarding request via AI Gateway.`);
          
          const apiResponse = await fetch(gatewayUrl, fetchOptions);

          console.log(`[${new Date().toISOString()}] Received response from DeepSeek API with status: ${apiResponse.status}`);

          if (apiResponse.ok) {
            // 如果成功，將回應串流回傳給前端
            return new Response(apiResponse.body, {
              status: apiResponse.status,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
            });
          } else {
            // 如果是 4xx 或 5xx 錯誤，但不是超時，可能不需要重試
            const errorText = await apiResponse.text();
            lastError = new Error(`DeepSeek API Error: ${apiResponse.status} ${apiResponse.statusText} - ${errorText}`);
            // 對於客戶端錯誤 (4xx)，通常不需要重試
            if (apiResponse.status >= 400 && apiResponse.status < 500) {
              console.error("Client error, breaking retry loop.", lastError);
              break; 
            }
          }
        } catch (error) {
          lastError = error;
          console.warn(`[${new Date().toISOString()}] Attempt ${i + 1} failed.`, error);
        }

        // 如果不是最後一次嘗試，則等待一段時間
        if (i < maxRetries - 1) {
          console.log(`Waiting 1 second before retry...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // 如果所有重試都失敗了，回傳最後一個錯誤
      console.error("All retries failed. Returning last known error.", lastError);
      return new Response(JSON.stringify({ error: lastError.message }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
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
