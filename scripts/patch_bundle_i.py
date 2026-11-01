import json

bundle_path = 'dist/assets/index-CTAXN4pq.js'
with open(bundle_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Patch i_ (subscribeToBookingApproval) to also check Cloud DB
old_i = 'function i_(n,s){let r=!1;const c=f=>{if(!r)try{const p=localStorage.getItem("paul_bookings")||"[]",b=JSON.parse(p).find(x=>x.id===n);s(b?{...b,adminApproved:!0,adminApprovedAt:f||new Date().toISOString()}:{id:n,name:"",shootType:"",datetime:"",status:"confirmed",adminApproved:!0,adminApprovedAt:f||new Date().toISOString(),createdAt:new Date().toISOString()})}catch{}};let d=null;try{d=new EventSource(`${Ri}/${Kv}/sse`),d.onmessage=f=>{try{const p=JSON.parse(f.data);if(p.message){const v=JSON.parse(p.message);(v==null?void 0:v.id)===n&&v.adminApproved&&c(v.adminApprovedAt)}}catch{}}}catch{}const h=setInterval(async()=>{var f;if(!r){try{const p=localStorage.getItem("paul_bookings")||"[]",b=JSON.parse(p).find(x=>x.id===n);if(b!=null&&b.adminApproved){c(b.adminApprovedAt);return}}catch{}try{const p=await Ii(Jn),v=(f=p==null?void 0:p.bookings)==null?void 0:f.find(b=>b.id===n);if(v!=null&&v.adminApproved){c(v.adminApprovedAt);return}}catch{}}},4e3);return()=>{r=!0,d==null||d.close(),clearInterval(h)}}'

new_i = 'function i_(n,s){let r=!1;const c=f=>{if(!r)try{const p=localStorage.getItem("paul_bookings")||"[]",b=JSON.parse(p).find(x=>x.id===n);s(b?{...b,adminApproved:!0,adminApprovedAt:f||new Date().toISOString()}:{id:n,name:"",shootType:"",datetime:"",status:"confirmed",adminApproved:!0,adminApprovedAt:f||new Date().toISOString(),createdAt:new Date().toISOString()})}catch{}};let d=null;try{d=new EventSource(`${Ri}/${Kv}/sse`),d.onmessage=f=>{try{const p=JSON.parse(f.data);if(p.message){const v=JSON.parse(p.message);(v==null?void 0:v.id)===n&&v.adminApproved&&c(v.adminApprovedAt)}}catch{}}}catch{}const h=setInterval(async()=>{var f;if(!r){try{const p=localStorage.getItem("paul_bookings")||"[]",b=JSON.parse(p).find(x=>x.id===n);if(b!=null&&b.adminApproved){c(b.adminApprovedAt);return}}catch{}try{const cdb=await _getClDev(),fd=cdb.find(b=>b.id===n);if(fd!=null&&fd.adminApproved){c(fd.adminApprovedAt);return}}catch{}try{const p=await Ii(Jn),v=(f=p==null?void 0:p.bookings)==null?void 0:f.find(b=>b.id===n);if(v!=null&&v.adminApproved){c(v.adminApprovedAt);return}}catch{}}},4e3);return()=>{r=!0,d==null||d.close(),clearInterval(h)}}'

idx = content.find(old_i)
print(f"i_ found: {idx != -1}")

if idx != -1:
    content = content[:idx] + new_i + content[idx+len(old_i):]
    with open(bundle_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("i_ patched with Cloud DB check!")
else:
    print("Could not find i_ to patch.")
