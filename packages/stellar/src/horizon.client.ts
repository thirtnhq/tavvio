import * as StellarSdk from '@stellar/stellar-sdk';

export interface HorizonConfig {
  network: 'testnet' | 'mainnet';
  horizonUrl?: string;
}

const HORIZON_URLS: Record<string, string> = {
  testnet: 'https://horizon-testnet.stellar.org',
  mainnet: 'https://horizon.stellar.org',
};

export class HorizonClient {
  private readonly server: StellarSdk.Horizon.Server;
  readonly networkPassphrase: string;

  constructor(config: HorizonConfig) {
    const url = config.horizonUrl || HORIZON_URLS[config.network];
    this.server = new StellarSdk.Horizon.Server(url);
    this.networkPassphrase =
      config.network === 'mainnet'
        ? StellarSdk.Networks.PUBLIC
        : StellarSdk.Networks.TESTNET;
  }

  getServer(): StellarSdk.Horizon.Server {
    return this.server;
  }

  async getAccount(
    publicKey: string,
  ): Promise<StellarSdk.Horizon.AccountResponse> {
    return this.server.loadAccount(publicKey);
  }

  async submitTransaction(
    tx: StellarSdk.Transaction | StellarSdk.FeeBumpTransaction,
  ): Promise<StellarSdk.Horizon.HorizonApi.SubmitTransactionResponse> {
    return this.server.submitTransaction(tx);
  }

  streamPayments(
    accountId: string,
    callback: (payment: StellarSdk.Horizon.ServerApi.OperationRecord) => void,
  ): () => void {
    const close = this.server
      .payments()
      .forAccount(accountId)
      .cursor('now')
      .stream({
        onmessage: callback,
      });

    return close as unknown as () => void;
  }

  async strictSendPaths(
    sourceAsset: StellarSdk.Asset,
    sourceAmount: string,
    destinationAssets: StellarSdk.Asset[],
  ) {
    return this.server
      .strictSendPaths(sourceAsset, sourceAmount, destinationAssets)
      .call();
  }

  async strictReceivePaths(
    sourceAssets: StellarSdk.Asset[],
    destinationAsset: StellarSdk.Asset,
    destinationAmount: string,
  ) {
    return this.server
      .strictReceivePaths(sourceAssets, destinationAsset, destinationAmount)
      .call();
  }
}