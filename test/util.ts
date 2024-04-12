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

export const deploy = async (client: algosdk.Algodv2, acct: algosdk.Account, tealCode: string) => {
  const suggestedParams = await client.getTransactionParams().do();
  const appCreateTxn = algosdk.makeApplicationCreateTxnFromObject({
    from: acct.addr,
    approvalProgram: await compileProgram(client, tealCode),
    clearProgram: await compileProgram(client, clear),
    numGlobalByteSlices: 0,
    numGlobalInts: 1,
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
export const assertGlobalState = async (client: algosdk.Algodv2, appId: number) => {
  const appInfo = await client.getApplicationByID(appId).do();
  const globalState = appInfo.params['global-state'][0];
  //console.log(`Raw global state ${JSON.stringify(globalState)}`);

  // decode b64 string key with Buffer
  const globalKey = Buffer.from(globalState.key, 'base64').toString();
  // decode b64 address value with encodeAddress and Buffer
  const globalValue = globalState.value.uint;

  console.log(`Decoded global state ${globalKey}: ${globalValue}`);
}