```
pandoc report-example.md -o report.pdf --from markdown --template=eisvogel --listings

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
