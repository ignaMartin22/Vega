import fuji from "../deployments/fuji.json" with { type: "json" };

export const FUJI = {
  chainId: 43113,
  rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  explorer: "https://explorer-test.avax.network/c-chain",
} as const;

/** Dirección del contrato desplegado (la completa Contratos). null = todavía no hay deploy. */
export const VEGA_REGISTRY_ADDRESS: string | null = fuji.address;
export const DEPLOY_BLOCK: number | null = fuji.deployBlock;

export const txUrl = (hash: string) => `${FUJI.explorer}/tx/${hash}`;
export const addressUrl = (addr: string) => `${FUJI.explorer}/address/${addr}`;
