import json

bundle_path = 'dist/assets/index-CTAXN4pq.js'
with open(bundle_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Locate where t_ starts
start_needle = 'async function t_(n){'
end_needle = 'function i_(n,s){'

start_idx = content.find(start_needle)
end_idx = content.find(end_needle)

print(f"start_idx: {start_idx}, end_idx: {end_idx}")

if start_idx != -1 and end_idx != -1:
    orig = content[start_idx:end_idx]
    print("Found block of length:", len(orig))
    
    replacement = """const _clDevUrl="https://api.restful-api.dev/objects/ff808181a09d98f701a1964d76377d4c";
const _seedBks=[{"id":"BK-2188","name":"kalette dan","phone":"0757460297","datetime":"2026-11-08T11:29","shootType":"Birthday party","location":"Kampala","budget":"UGX 50,000","notes":"Booked via Paul Photography Portal","status":"pending","paymentMethod":"Airtel Money","paymentStatus":"confirmed","transactionId":"160252189262","amountPaid":"50,000","createdAt":"2026-11-01T08:35:00.000Z","adminApproved":false}];
async function _getClDev(){try{const r=await fetch(`${_clDevUrl}?_t=${Date.now()}`,{cache:"no-store"});if(r.ok){const j=await r.json();if(j?.data?.bookings&&Array.isArray(j.data.bookings))return j.data.bookings}}catch(e){}return[]}
async function _putClDev(b){try{await fetch(_clDevUrl,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:"bookings",data:{bookings:b,updatedAt:new Date().toISOString()}})}) }catch(e){}}
async function _getLocApi(){try{const c=new AbortController(),t=setTimeout(()=>c.abort(),1500),r=await fetch("/api/bookings",{signal:c.signal,cache:"no-store"});clearTimeout(t);if(r.ok){const j=await r.json();if(Array.isArray(j))return j}}catch(e){}return[]}
async function _postLocApi(b){try{const c=new AbortController(),t=setTimeout(()=>c.abort(),1500);await fetch("/api/bookings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b),signal:c.signal});clearTimeout(t)}catch(e){}}
async function _appLocApi(id){try{const c=new AbortController(),t=setTimeout(()=>c.abort(),1500);await fetch("/api/bookings/approve",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id}),signal:c.signal});clearTimeout(t)}catch(e){}}
async function _delLocApi(id){try{const c=new AbortController(),t=setTimeout(()=>c.abort(),1500);await fetch(`/api/bookings/${id}`,{method:"DELETE",signal:c.signal});clearTimeout(t)}catch(e){}}

async function t_(n){
  try{const s=localStorage.getItem("paul_bookings")||"[]",r=JSON.parse(s),c=[n,...r.filter(d=>d.id!==n.id)];localStorage.setItem("paul_bookings",JSON.stringify(c))}catch{}
  try{const cur=await _getClDev(),c=[n,...cur.filter(d=>d.id!==n.id)];await _putClDev(c)}catch{}
  _postLocApi(n).catch(()=>{});
  try{const s=await Ii(Jn),r=(s==null?void 0:s.bookings)||[],c=[n,...r.filter(d=>d.id!==n.id)];await so(Jn,{bookings:c,updatedAt:new Date().toISOString()})}catch{}
  try{return await fetch(`${Ri}/${Fv}`,{method:"POST",body:JSON.stringify(n),headers:{Title:`New Booking: ${n.name}`,Tags:"camera,moneybag",Cache:"yes",Click:"https://www.paulphotography256.com/#admin"}}),!0}catch{return!1}
}
async function nb(){
  const n=localStorage.getItem("paul_bookings")||"[]";let s=[];try{s=JSON.parse(n)}catch{}
  const clDev=await _getClDev();
  const locApi=await _getLocApi();
  let r=[];try{const h=await Ii(Jn);h!=null&&h.bookings&&Array.isArray(h.bookings)&&(r=h.bookings)}catch{}
  let ntfy=[];
  try{const h=await fetch(`${Ri}/${Fv}/json?poll=1&since=7d`);if(h.ok){const p=(await h.text()).trim().split(`\\n`).filter(Boolean);for(const v of p)try{const b=JSON.parse(v);if(b.message){const x=JSON.parse(b.message);x!=null&&x.id&&ntfy.push(x)}}catch{}}}catch{}
  const c=new Map();
  for(const h of [..._seedBks,...s,...ntfy,...r,...locApi,...clDev]){
    if(!h||!h.id)continue;
    const f=c.get(h.id);
    if(!f){c.set(h.id,h)}
    else{
      const isApp=Boolean(h.adminApproved||f.adminApproved);
      c.set(h.id,{...f,...h,adminApproved:isApp,status:isApp?"confirmed":(h.status||f.status||"pending")});
    }
  }
  const d=Array.from(c.values()).sort((h,f)=>new Date(f.createdAt||"").getTime()-new Date(h.createdAt||"").getTime());
  try{localStorage.setItem("paul_bookings",JSON.stringify(d))}catch{}
  return d;
}
async function a_(n){
  const s=new Date().toISOString();
  try{const r=localStorage.getItem("paul_bookings")||"[]",d=JSON.parse(r).map(h=>h.id===n?{...h,adminApproved:!0,adminApprovedAt:s,status:"confirmed"}:h);localStorage.setItem("paul_bookings",JSON.stringify(d))}catch{}
  try{const cur=await _getClDev();if(cur.length>0){const upd=cur.map(h=>h.id===n?{...h,adminApproved:!0,adminApprovedAt:s,status:"confirmed"}:h);await _putClDev(upd)}}catch{}
  _appLocApi(n).catch(()=>{});
  try{const r=await Ii(Jn);if(r!=null&&r.bookings){const c=r.bookings.map(d=>d.id===n?{...d,adminApproved:!0,adminApprovedAt:s,status:"confirmed"}:d);await so(Jn,{bookings:c,updatedAt:s})}}catch{}
  try{return await fetch(`${Ri}/${Kv}`,{method:"POST",body:JSON.stringify({id:n,adminApproved:!0,adminApprovedAt:s}),headers:{Title:"Booking Approved",Tags:"white_check_mark",Cache:"yes"}}),!0}catch{return!1}
}
async function n_(n){
  try{const r=localStorage.getItem("paul_bookings")||"[]",d=JSON.parse(r).filter(h=>h.id!==n);localStorage.setItem("paul_bookings",JSON.stringify(d))}catch{}
  try{const cur=await _getClDev(),upd=cur.filter(h=>h.id!==n);await _putClDev(upd)}catch{}
  _delLocApi(n).catch(()=>{});
  try{const s=await Ii(Jn);if(s!=null&&s.bookings){const r=s.bookings.filter(c=>c.id!==n);await so(Jn,{bookings:r,updatedAt:new Date().toISOString()})}return!0}catch(s){return!1}
}
"""
    new_content = content[:start_idx] + replacement + content[end_idx:]
    with open(bundle_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Bundle patched successfully!")
else:
    print("Could not find start or end needles.")
