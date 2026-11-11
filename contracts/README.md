# contracts/ — VegaRegistry (Foundry)

Responsable: **Integrante 1 · Contratos**. Roadmap: [`docs/roadmap/1-contratos.md`](../docs/roadmap/1-contratos.md)

```bash
# una sola vez
curl -L https://foundry.paradigm.xyz | bash && foundryup
cd contracts && forge install foundry-rs/forge-std --no-git

forge build
forge test -vv
# deploy (requiere FUJI_RPC_URL y PRIVATE_KEY en el entorno)
forge script script/Deploy.s.sol --rpc-url fuji --private-key $PRIVATE_KEY --broadcast
```

Después del deploy: completar `shared/deployments/fuji.json` (address, deployBlock, deployTx) y avisar al equipo.
La interfaz pública está en `src/IVegaRegistry.sol` y espejada en `shared/src/abi.ts`: **no cambiarla sin avisar**.
