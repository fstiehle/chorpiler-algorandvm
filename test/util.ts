import algosdk from "algosdk";
import path from "path";
import fs from 'fs';
import { TEAL_PATH } from "./config";

const clear = fs.readFileSync(
  path.join(TEAL_PATH, 'test.teal'),
  'utf8'
);

// From https://github.com/algorand/js-algorand-sdk/blob/develop/examples/utils.ts
export const compileProgram = async (
  _client: algosdk.Algodv2,
  source: string
) => {
  const compileResponse = await _client.compile(Buffer.from(source)).do();
  const compiledBytes = new Uint8Array(
    Buffer.from(compileResponse.result, 'base64')
  );
  return compiledBytes;
}

export const deploy = async (
  client: algosdk.Algodv2, 
  acct: algosdk.Account, 
  tealCode: string,
  ints = 1,
  bytes = 0
) => {
  const suggestedParams = await client.getTransactionParams().do();
  const appCreateTxn = algosdk.makeApplicationCreateTxnFromObject({
    from: acct.addr,
    approvalProgram: await compileProgram(client, tealCode),
    clearProgram: await compileProgram(client, clear),
    numGlobalByteSlices: bytes,
    numGlobalInts: ints,
    numLocalByteSlices: 0,
    numLocalInts: 0,
    suggestedParams,
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    appArgs: [new Uint8Array(0)]
  });

  await client
    .sendRawTransaction(appCreateTxn.signTxn(acct.sk))
    .do();

  const res = await algosdk.waitForConfirmation(
    client,
    appCreateTxn.txID().toString(),
    1 );

  //console.log(res);
  return res["application-index"];
}

// From https://developer.algorand.org/docs/get-details/dapps/smart-contracts/frontend/apps/#read-state
export const getGlobalState = async (client: algosdk.Algodv2, appId: number) => {
  const appInfo = await client.getApplicationByID(appId).do();
  if (!('global-state' in appInfo.params)) {
    return { uint: 0, byte: "" }
  }

  const globalState = appInfo.params['global-state'][0];
  //console.log(`Raw global state ${JSON.stringify(appInfo.params['global-state'])}`);

  // decode b64 string key with Buffer
  // const globalKey = Buffer.from(globalState.key, 'base64').toString();
  // decode b64 address value with encodeAddress and Buffer
  // const globalValue = globalState.value.uint;

  //console.log(`Decoded global state ${globalKey}: ${globalValue}`);
  return { uint: globalState.value.uint as number, byte: Buffer.from(globalState.value.bytes, "base64") }
}

export const sendPayment = async (
  client: algosdk.Algodv2, 
  from: algosdk.Account, 
  to: string, 
  amount: number = 1000000) => {

  // from: https://developer.algorand.org/docs/sdks/javascript/#build-first-transaction
  const suggestedParams = await client.getTransactionParams().do();
  const tx = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: from.addr,
    suggestedParams,
    to: to,
    amount: amount
  });

  const signedTxn = tx.signTxn(from.sk);
  const { txId } = await client.sendRawTransaction(signedTxn).do();
  return txId;
}