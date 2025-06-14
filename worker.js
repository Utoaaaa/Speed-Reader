addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);

  // --- API 路由處理 ---
  // 監聽 /speedreader/api/deepseek 路徑
  const API_PATH = '/speedreader/api/deepseek';
  if (url.pathname === API_PATH) {
    // 只允許 POST 方法
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }
    // 直接呼叫後端邏輯
    return handleApiRequest(request);
  }

  // --- 靜態網站路由處理 ---
  const { pathname } = url;
  let key = pathname;

  // 處理根路徑和子目錄根路徑
  if (key === '/speedreader/' || key === '/speedreader') {
    key = '/speedreader/index.html';
  } else if (key.startsWith('/speedreader')) {
    // 確保路徑是 /speedreader/file.ext 格式
    key = `/speedreader${pathname.substring('/speedreader'.length)}`;
  } else {
    // 對於不匹配 /speedreader/ 的路徑，也嘗試提供 index.html 作為 SPA 回退
    key = '/speedreader/index.html';
  }

  const asset = staticAssets[key];

  if (asset) {
    // 從 Base64 解碼
    const buffer = Uint8Array.from(atob(asset.content), c => c.charCodeAt(0));
    return new Response(buffer, {
      headers: { 'Content-Type': asset.mimeType }
    });
  }

  // 如果找不到特定資產，則回退到 index.html
  const indexAsset = staticAssets['/speedreader/index.html'];
  if (indexAsset) {
    const buffer = Uint8Array.from(atob(indexAsset.content), c => c.charCodeAt(0));
    return new Response(buffer, {
      headers: { 'Content-Type': indexAsset.mimeType }
    });
  }

  return new Response('Asset not found', { status: 404 });
}

/**
 * 處理對 OpenRouter API 的請求
 * @param {Request} request
 */
async function handleApiRequest(request) {
  // 從 Worker 的環境變數中讀取 API Key
  // **重要**: 您需要在 Worker 的設定中，繫結您在 Pages 中建立的 DEEPSEEK_API_KEY 機密
  const openRouterApiKey = env.DEEPSEEK_API_KEY;

  if (!openRouterApiKey) {
    return new Response(JSON.stringify({ error: 'DEEPSEEK_API_KEY not configured in Worker secrets. Please bind the secret from your Pages project.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  try {
    let requestBody = await request.json();
    requestBody.model = 'deepseek/deepseek-chat-v3-0324:free';

    const fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openRouterApiKey}`,
        'HTTP-Referer': request.headers.get('Referer') || '', // 動態獲取 Referer
        'X-Title': 'Speed Reader',
      },
      body: JSON.stringify(requestBody),
    };

    const openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
    const apiResponse = await fetch(openRouterUrl, fetchOptions);

    // 設定 CORS header，允許前端接收回應
    const responseHeaders = new Headers(apiResponse.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');

    return new Response(apiResponse.body, {
      status: apiResponse.status,
      headers: responseHeaders,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal Server Error in Worker.', message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
