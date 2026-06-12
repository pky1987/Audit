```
pandoc report-example.md -o report.pdf --from markdown --template=eisvogel --listings

```
```
pandoc README.md -o Miniclip.pdf   --from markdown   --template=eisvogel   
--listings   --pdf-engine=xelatex
```
```
bb write_vk --oracle_hash keccak -b ./target/circuits.json -o ./target
```
```
bb write_solidity_verifier -k ./target/vk -o ./target/Verifier.sol
```
```
rm -rf PRust/.git
```
```
git push -u origin main --force
```
```
git config --global user.email
```
# Remove deleted file history from Github

1. Select files which need to be deleted.

```
git filter-repo --invert-paths --path DEVELOPER_QUICK_REFERENCE.md --path FEATURE_ROADMAP.md --path PHASE_1_2_3_COMPLETION.md --path PHASE_2_COMPLETION.md --path PROJECT_STATUS.md
```
2. Fresh Clone Required

git-filter-repo refuses to run on non-fresh clones. Clone to a new directory first.

```
git clone https://github.com/pky1987/PChat.git fresh-clone
cd fresh-clone

```

3. Run History Rewrite

Use git-filter-repo with --sensitive-data-removal flag for extra safety.

```
git filter-repo --sensitive-data-removal --invert-paths --path DEVELOPER_QUICK_REFERENCE.md --path FEATURE_ROADMAP.md --path PHASE_1_2_3_COMPLETION.md --path PHASE_2_COMPLETION.md --path PROJECT_STATUS.md
```

4. Force Push All Refs

Overwrite remote history completely.

```
git push --force --mirror origin
```

<div align="center" style="margin: 80px 0;">
  <img src="https://user-images.githubusercontent.com/74038190/212284100-561aa473-3905-4a80-b561-0d28506553ee.gif" width="800">
</div>

5.n8n

```
docker run -it --rm -p 5678:5678 -v n8n_data:/home/node/.n8n docker.n8n.io/n8nio/n8n:nightly
```
6. Testing Indiviudal function of test file.

```
cd otp && mix test test/otp/abuse/detector_test.exs --only "test abuse response actions logs abuse incidents"
```

7. POST code

```
curl -i -X POST http://localhost:4000/api/delivery-report \
  -H "Content-Type: application/json" \
  -d '{"provider_message_id":"abc123","status":"delivered","delivered_at":"2025-12-31T12:00:00Z"}'

```

8. Creating and Generating API Key

### Export OTP 

```
export OTP_ADMIN_TOKEN="abcdefm"

```
### Check whether if it exists or not.

```
echo $OTP_ADMIN_TOKEN

```
### Post Code

```
curl -i -X POST http://localhost:4000/api/admin/api_keys \
  -H "x-admin-token: Prakash-Yadav-03" \
  -H "Content-Type: application/json" \
  -d '{"name":"Prakash"}'


```

```
curl -s "http://localhost:5000/api/cameras" -H "Origin: http://localhost:5175" | head -20
```

# Python Virtual Environment
1. Create virtual environment:
```
python3 -m venv venv
```
2. Activate virtual environment:
```
source venv/bin/activate

```

```
find 29112025/Airis/smart_surveillance -name "*.py" -not -path "*/venv/*" -exec grep -l "cv2\.rectangle\|draw.*box\|bounding.*box" {} \;
```

```
https://script.google.com/macros/s/AKfycbytSTMKzq7cywvrgphbLUwQ50C1QkWfaMf_1FtbcY_js7Ku8d1-XZXNriIHF_D4_4CG/exec
```
```
grep -n "def " lib/elx/real_time_translation.ex
```
```
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/test_db && set NODE_ENV=test && npm run test:coverage
```
```
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/test_db && set NODE_ENV=test && npx jest src/tests/notifications.test.ts --coverage
```
```
npm view @sentry/nextjs versions --json
```

```
 git restore --staged backend/src/scripts/seedAncillary.ts
```

```
wsl -d Ubuntu bash -c "cd /tmp && rm -rf _sync_clean && git clone https://github.com/pky1987/pravaallp_crm.git _sync_clean && cd _sync_clean && /home/prakash/.local/bin/git-filter-repo --invert-paths --path DEVELOPER_QUICK_REFERENCE.md --path FEATURE_ROADMAP.md --path PHASE_1_2_3_COMPLETION.md --path PHASE_2_COMPLETION.md --path PROJECT_STATUS.md --path CLAUDE.md --path DEPLOY.md --path deploy.md --path PRISMA_SYNC_SETUP.md --path prisma_sync_setup.md --path vercel.json --path supabase-export && git remote add mirror https://github.com/pravaallp/pravaa_crm.git && git push mirror --force --all && git push mirror --force --tags && cd /tmp && rm -rf _sync_clean && echo DONE"

```

## One Github clone commit wise to another:

### Verify git-filter-repo
```
/home/prakash/.local/bin/git-filter-repo --version

```

### Clean up temp folder

```
wsl -d Ubuntu bash -c "rm -rf /tmp/_sync_clean && echo 'Clean done'"

```
### Clone personal repo

```
wsl -d Ubuntu bash -c "cd /tmp/_sync_clean && /home/prakash/.local/bin/git-filter-repo --invert-paths --path DEVELOPER_QUICK_REFERENCE.md --path FEATURE_ROADMAP.md --path PHASE_1_2_3_COMPLETION.md --path PHASE_2_COMPLETION.md --path PROJECT_STATUS.md --path CLAUDE.md --path DEPLOY.md --path deploy.md --path PRISMA_SYNC_SETUP.md --path prisma_sync_setup.md --path vercel.json --path supabase-export && echo 'Filter done'"
```
### Push to company GitHub

```
wsl -d Ubuntu bash -c "cd /tmp/_sync_clean && git remote add mirror https://github.com/pravaallp/pravaa_crm.git && git push mirror --force --all && git push mirror --force --tags && echo 'Push done'"

```
### Clean up

```
wsl -d Ubuntu bash -c "rm -rf /tmp/_sync_clean && echo 'Cleanup done'"
```

# Git changes from previous commit
```
git diff --stat -- crm/pages/MasterSites.tsx && echo "---" && git diff -- crm/pages/MasterSites.tsx
```

```
git stash -u -m "wip: footer/roi mailto + gitignore before filter-repo"

```
```
wsl -d Ubuntu bash -c "cd /mnt/c/Users/ASUS/Projects/safe-accommodation && /home/prakash/.local/bin/git-filter-repo --invert-paths --path dev.log --force"
```
```
wsl -e bash -lc "cd /home/prakash/pravaa_crm/crm && npx eslint pages/ToolsGuides.tsx --format json | node -e \"let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const r=JSON.parse(d);let e=0,w=0;r.forEach(f=>f.messages.forEach(m=>{console.log(m.line+':'+m.column+' '+m.ruleId+' '+m.message.split('\\n')[0]);if(m.severity===2)e++;else w++}));console.log('TOTAL errors:'+e+' warnings:'+w)})\""
```

```
wsl -e bash -lc "cd /home/prakash/pravaa_crm/crm && npx eslint . --format json 2>/dev/null | node -e \"let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const r=JSON.parse(d);let e=0,w=0;for(const f of r){for(const m of f.messages){console.log(f.filePath.split('/crm/')[1]+':'+m.line+':'+m.column+' '+m.ruleId+' '+m.message.split('\\\\n')[0]);if(m.severity===2)e++;else w++;}}console.log('TOTAL errors:'+e+' warnings:'+w);});\""
```









