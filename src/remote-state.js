async function request(method, body) {
  try {
  const response = await fetch('/api/state', {
    cache: 'no-store',
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let payload = {};
  try { payload = await response.json(); } catch {}
  return { response, payload };
  }catch{return {response:{status:0},payload:{error:'网络连接失败，数据保留在本机，请稍后重试。'}};}
}

export async function loadSharedState() {
  const { response, payload } = await request('GET');
  return { status: response.status, ...payload };
}

export async function saveSharedState(data, revision) {
  const { response, payload } = await request('PUT', { data, revision });
  return { status: response.status, ...payload };
}
