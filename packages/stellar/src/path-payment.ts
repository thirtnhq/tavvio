import * as StellarSdk from '@stellar/stellar-sdk';
import { HorizonClient } from './horizon.client';

export interface PathPaymentParams {
  sourceAsset: StellarSdk.Asset;
  sourceAmount: string;
  destinationAsset: StellarSdk.Asset;
  destinationMinAmount: string;
  destinationAccount: string;
  path: StellarSdk.Asset[];
  sourceAccount: string;
}

export interface StrictSendPathRecord {
  sourceAsset: StellarSdk.Asset;
  sourceAmount: string;
  destinationAsset: string;
  destinationAmount: string;
  path: Array<{ asset_type: string; asset_code?: string; asset_issuer?: string }>;
}

/**
 * Query Horizon for strict-send paths.
 * "I want to send exactly X of asset A — what's the best I can receive of asset B?"
 */
export async function findStrictSendPaths(
  horizon: HorizonClient,
  sourceAsset: StellarSdk.Asset,
  sourceAmount: string,
  destinationAssets: StellarSdk.Asset[],
) {
  return horizon.strictSendPaths(sourceAsset, sourceAmount, destinationAssets);
}

/**
 * Query Horizon for strict-receive paths.
 * "I want the receiver to get exactly Y of asset B — what's the least I need to send?"
 */
export async function findStrictReceivePaths(
  horizon: HorizonClient,
  sourceAssets: StellarSdk.Asset[],
  destinationAsset: StellarSdk.Asset,
  destinationAmount: string,
) {
  return horizon.strictReceivePaths(
    sourceAssets,
    destinationAsset,
    destinationAmount,
  );
}

/**
 * Build a path_payment_strict_send transaction (does NOT sign or submit).
 */
export function buildPathPaymentTx(
  params: PathPaymentParams,
  networkPassphrase: string,
  sourceAccountObj: StellarSdk.Account,
): StellarSdk.Transaction {
  const tx = new StellarSdk.TransactionBuilder(sourceAccountObj, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase,
  })
    .addOperation(
      StellarSdk.Operation.pathPaymentStrictSend({
        sendAsset: params.sourceAsset,
        sendAmount: params.sourceAmount,
        destination: params.destinationAccount,
        destAsset: params.destinationAsset,
        destMin: params.destinationMinAmount,
        path: params.path,
      }),
    )
    .setTimeout(30)
    .build();

  return tx;
}

/**
 * Build, sign, and submit a path payment in one call.
 */
export async function executePathPayment(
  horizon: HorizonClient,
  params: PathPaymentParams,
  signerKeypair: StellarSdk.Keypair,
): Promise<StellarSdk.Horizon.HorizonApi.SubmitTransactionResponse> {
  const account = await horizon.getAccount(signerKeypair.publicKey());
  const tx = buildPathPaymentTx(
    params,
    horizon.networkPassphrase,
    account,
  );

  tx.sign(signerKeypair);
  return horizon.submitTransaction(tx);
}