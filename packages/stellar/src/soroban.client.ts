import * as StellarSdk from "@stellar/stellar-sdk";

export interface SorobanConfig {
  rpcUrl: string;
  networkPassphrase: string;
}

export interface ContractEventRecord {
  id: string;
  type: string;
  ledger: number;
  contractId: string;
  topic: StellarSdk.xdr.ScVal[];
  value: StellarSdk.xdr.ScVal;
}

export class SorobanClient {
  private readonly server: StellarSdk.rpc.Server;
  private readonly networkPassphrase: string;

  constructor(config: SorobanConfig) {
    this.server = new StellarSdk.rpc.Server(config.rpcUrl);
    this.networkPassphrase = config.networkPassphrase;
  }

  getServer(): StellarSdk.rpc.Server {
    return this.server;
  }

  /**
   * Invoke a Soroban contract method: build, simulate, sign, submit.
   */
  async invokeContract(
    contractId: string,
    method: string,
    args: StellarSdk.xdr.ScVal[],
    signerKeypair: StellarSdk.Keypair,
  ): Promise<StellarSdk.rpc.Api.GetTransactionResponse> {
    const contract = new StellarSdk.Contract(contractId);
    const sourceAccount = await this.server.getAccount(
      signerKeypair.publicKey(),
    );

    const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build();

    const simulated = await this.server.simulateTransaction(tx);

    if (StellarSdk.rpc.Api.isSimulationError(simulated)) {
      throw new Error(
        Simulation failed: ${(simulated as StellarSdk.rpc.Api.SimulateTransactionErrorResponse).error},
      );
  }

  const prepared = StellarSdk.rpc
    .assembleTransaction(
      tx,
      simulated as StellarSdk.rpc.Api.SimulateTransactionSuccessResponse,
    )
    .build();

    prepared.sign(signerKeypair);

  const sendResponse = await this.server.sendTransaction(prepared);

  if(sendResponse.status === "ERROR") {
  throw new Error(`Transaction send failed: ${sendResponse.status}`);
}

// Poll for completion
let result = await this.server.getTransaction(sendResponse.hash);
while (
  result.status === StellarSdk.rpc.Api.GetTransactionStatus.NOT_FOUND
) {
  await sleep(1000);
  result = await this.server.getTransaction(sendResponse.hash);
}

if (result.status === StellarSdk.rpc.Api.GetTransactionStatus.FAILED) {
  throw new Error(`Transaction failed: ${sendResponse.hash}`);
}

return result;
  }

  /**
   * Read a contract storage value without submitting a transaction.
   */
  async getContractValue(
  contractId: string,
  key: StellarSdk.xdr.ScVal,
): Promise < StellarSdk.xdr.ScVal | null > {
  const ledgerKey = StellarSdk.xdr.LedgerKey.contractData(
    new StellarSdk.xdr.LedgerKeyContractData({
      contract: new StellarSdk.Address(contractId).toScAddress(),
      key,
      durability: StellarSdk.xdr.ContractDataDurability.persistent(),
    }),
  );

  const entries = await this.server.getLedgerEntries(ledgerKey);
  if(entries.entries.length === 0) return null;

  return entries.entries[0].val.contractData().val();
}

/**
 * Poll for new contract events using cursor tracking.
 * Calls callback for each event. Returns a stop function.
 */
streamContractEvents(
  contractId: string,
  callback: (event: ContractEventRecord) => void | Promise<void>,
  pollIntervalMs = 5000,
): () => void {
  let running = true;
  let cursor: string | undefined;

  const poll = async () => {
    while (running) {
      try {
        const filters = [
          { type: "contract" as const, contractIds: [contractId] },
        ];
        const response = cursor
          ? await this.server.getEvents({ filters, cursor })
          : await this.server.getEvents({ filters, startLedger: 1 });

        if (response.cursor) cursor = response.cursor;
        for (const event of response.events) {
          await callback({
            id: event.id,
            type: event.type,
            ledger: event.ledger,
            contractId: (event.contractId as unknown as string) ?? contractId,
            topic: event.topic,
            value: event.value,
          });
        }
      } catch {
        // Silently retry on transient errors
      }

      await sleep(pollIntervalMs);
    }
  };

  poll();

    return() => {
  running = false;
};
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}