const rowId = 'primary';
import {START_DATE} from '../src/operating-period.js';

function send(response, status, body) {
  response.status(status).json(body);
}

function configured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function supabase(path, options = {}) {
  const response = await fetch(process.env.SUPABASE_URL + '/rest/v1/' + path, {
    ...options,
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      ...(process.env.SUPABASE_SERVICE_ROLE_KEY.startsWith('eyJ')?{Authorization:'Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY}:{}),
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return response;
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control','private, no-store');
  if (!configured()) return send(response, 503, { error: 'Supabase is not configured yet.' });

  if (request.method === 'GET') {
    const result = await supabase('app_state?id=eq.' + rowId + '&select=data,revision,updated_at');
    if (!result.ok) return send(response, 502, { error: 'Unable to read shared data.' });
    const rows = await result.json();
    return rows[0] ? send(response, 200, rows[0]) : send(response, 404, { error: 'No shared data has been initialized.' });
  }

  if (request.method === 'PUT') {
    const { data, revision } = request.body ?? {};
    if (!data || !Array.isArray(data.teachers) || !data.records || typeof data.records !== 'object' || Array.isArray(data.records)) return send(response, 400, { error: 'A complete data snapshot is required.' });
    if(revision!==null&&revision!==undefined&&(!Number.isSafeInteger(revision)||revision<1))return send(response,400,{error:'Invalid revision.'});
    const earlier=Object.entries(data.records).filter(([key])=>key.slice(-10)<START_DATE);
    if(earlier.length){
      const current=await supabase('app_state?id=eq.'+rowId+'&select=data');
      if(!current.ok)return send(response,502,{error:'Unable to validate record dates.'});
      const prior=(await current.json())[0]?.data?.records||{};
      if(earlier.some(([key,value])=>JSON.stringify(prior[key])!==JSON.stringify(value)))return send(response,400,{error:'Records start on 2026-10-20. Earlier records cannot be added or modified.'});
    }

    if (revision === null || revision === undefined) {
      const created = await supabase('app_state', {
        method: 'POST',
        headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
        body: JSON.stringify({ id: rowId, data, revision: 1 }),
      });
      if (!created.ok) return send(response, 502, { error: 'Unable to initialize shared data.' });
      const rows = await created.json();
      if (rows[0]) return send(response, 201, rows[0]);
      return send(response, 409, { error: 'Shared data was initialized by another operator. Reload before saving.' });
    }

    const updated = await supabase('app_state?id=eq.' + rowId + '&revision=eq.' + Number(revision), {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ data, revision: Number(revision) + 1, updated_at: new Date().toISOString() }),
    });
    if (!updated.ok) return send(response, 502, { error: 'Unable to save shared data.' });
    const rows = await updated.json();
    return rows[0] ? send(response, 200, rows[0]) : send(response, 409, { error: 'Another operator saved changes first. Reload before saving again.' });
  }

  response.setHeader('Allow', 'GET, PUT');
  return send(response, 405, { error: 'Method not allowed.' });
}
