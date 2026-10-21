export default async function handler(request,response){
 response.setHeader('Cache-Control','no-store');
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return response.status(503).json({ready:false});
 try{
  const result=await fetch(url+'/rest/v1/app_state?select=id&limit=0',{headers:{apikey:key,...(key.startsWith('eyJ')?{Authorization:'Bearer '+key}:{})}});
  return response.status(result.ok?200:503).json({ready:result.ok});
 }catch{return response.status(503).json({ready:false});}
}
