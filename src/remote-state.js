const codeKey = 'slot-salary-access-code';

export function getAccessCode() {
  if(typeof window!=='undefined'){
    const access=new URLSearchParams(window.location.hash.slice(1)).get('access');
    if(access){rememberAccessCode(access);window.history.replaceState(null,'',window.location.pathname+window.location.search);return access;}
  }
  try { return localStorage.getItem(codeKey) || ''; } catch { return ''; }
}

export function rememberAccessCode(code) {
  try { localStorage.setItem(codeKey, code); } catch {}
}

async function request(method, code, body) {
  try {
  const response = await fetch('/api/state', {
    cache: 'no-store',
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-slot-salary-access-code': code,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let payload = {};
  try { payload = await response.json(); } catch {}
  return { response, payload };
  }catch{return {response:{status:0},payload:{error:'网络连接失败，数据保留在本机，请稍后重试。'}};}
}

export async function loadSharedState(code) {
  const { response, payload } = await request('GET', code);
  return { status: response.status, ...payload };
}

export async function saveSharedState(code, data, revision) {
  const { response, payload } = await request('PUT', code, { data, revision });
  return { status: response.status, ...payload };
}
