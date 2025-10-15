```
pandoc report-example.md -o report.pdf --from markdown --template=eisvogel --listings

```
```
bb write_vk --oracle_hash keccak -b ./target/circuits.json -o ./target
```
```
bb write_solidity_verifier -k ./target/vk -o ./target/Verifier.sol
```