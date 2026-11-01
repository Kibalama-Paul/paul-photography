import os

bundle_path = os.path.join(os.path.dirname(__file__), '..', 'dist', 'assets', 'index-CTAXN4pq.js')
with open(bundle_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Find the definition of `async function so(`
needle = 'async function so(n,s){'
idx = text.find(needle)
if idx != -1:
    end_needle = 'console.warn'
    end_idx = text.find(end_needle, idx)
    if end_idx != -1:
        close_idx = text.find('}}', end_idx) + 2
        original_so = text[idx:close_idx]
        print('Original so:', original_so)
        
        replacement_so = (
            'async function so(n,s){'
            'try{const p=await fetch(`/api/cloud-sync?bin=${n}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(s)});if(p.ok)return!0}catch(_){}'
            + original_so[len('async function so(n,s){'):]
        )
        text = text[:idx] + replacement_so + text[close_idx:]
        with open(bundle_path, 'w', encoding='utf-8') as f:
            f.write(text)
        print('Successfully patched so() in dist bundle!')
    else:
        print('Could not find end needle for so()')
else:
    print('Could not find needle for so()')
