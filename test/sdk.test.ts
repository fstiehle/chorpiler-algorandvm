import {expect} from 'chai';
import algosdk from "algosdk";
import fs from 'fs';
import path from 'path';

const token = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const server = 'http://127.0.0.1';
const port = 4001;
const client = new algosdk.Algodv2(token, server, port);
const acct = algosdk.mnemonicToSecretKey("friend across welcome dish nothing scan furnace feed gloom divert stay gas crazy meat portion toss adapt laptop target jungle smooth level great abandon patch");

let appID = 0;

// From https://github.com/algorand/js-algorand-sdk/blob/develop/examples/utils.ts
async function compileProgram(
  client: algosdk.Algodv2,
  source: string
) {
  const compileResponse = await client.compile(Buffer.from(source)).do();
  const compiledBytes = new Uint8Array(
    Buffer.from(compileResponse.result, 'base64')
  );
  return compiledBytes;
}

const tealTest = fs.readFileSync(
  path.join(__dirname, 'teal/test.teal'),
  'utf8'
);
const tealTemplate = fs.readFileSync(
  path.join(__dirname, 'teal/template.teal'),
  'utf8'
);

describe('Test Sandbox', () => {  

  it("Is Sandbox up",  async () => { 
    await client.status().do();
  });

  it("Compile test.teal",  async () => { 

    await compileProgram(client, tealTest)
    .then((r) => {
      expect(r).to.be.instanceOf(Uint8Array)
    });

  });

  it("Compile template.teal",  async () => { 

    await compileProgram(client, tealTemplate)
    .then((r) => {
      expect(r).to.be.instanceOf(Uint8Array)
    });

  });

});

describe('Test template.teal', () => {

  before("Compile & Deploy",  async () => { 
    
    const suggestedParams = await client.getTransactionParams().do();
    const appCreateTxn = algosdk.makeApplicationCreateTxnFromObject({
      from: acct.addr,
      approvalProgram: await compileProgram(client, tealTemplate),
      clearProgram: await compileProgram(client, tealTest),
      numGlobalByteSlices: 0,
      numGlobalInts: 1,
      numLocalByteSlices: 0,
      numLocalInts: 0,
      suggestedParams,
      onComplete: algosdk.OnApplicationComplete.NoOpOC,
    });

    await client
      .sendRawTransaction(appCreateTxn.signTxn(acct.sk))
      .do();

    const res = await algosdk.waitForConfirmation(
      client,
      appCreateTxn.txID().toString(),
      2 )

    expect(res).to.contain.keys("application-index");
    expect(res["application-index"]).to.be.a("Number");
    appID = res["application-index"];
    console.log(appID);

  });

  it('run template.teal', async () => {

    const suggestedParams = await client.getTransactionParams().do();
    const tx = algosdk.makeApplicationCallTxnFromObject({
      from: acct.addr,
      suggestedParams,
      appIndex: appID,
      onComplete: algosdk.OnApplicationComplete.NoOpOC,
    });

    await client
      .sendRawTransaction(tx.signTxn(acct.sk))
      .do();

    const res = await algosdk.waitForConfirmation(
      client,
      tx.txID().toString(),
      2 )
    
    console.log(res);

  });

});

 /*  
 
 const atc = new algosdk.AtomicTransactionComposer;
    atc.addTransaction({
      txn: txAppCreate,
      signer: signer,
    });
  
    const simreq = new algosdk.modelsv2.SimulateRequest({
      txnGroups: [],
      allowEmptySignatures: true,
      execTraceConfig: new algosdk.modelsv2.SimulateTraceConfig({
          enable: true,
          scratchChange: true,
          stackChange: true,
          stateChange: true,
      }),
    });
    const simres = await atc.simulate(client, simreq);

    console.log(simres.simulateResponse.txnGroups[0].txnResults[0].txnResult.applicationIndex);

 const simreq = new algosdk.modelsv2.SimulateRequest({
      txnGroups: [],
      allowEmptySignatures: true,
      execTraceConfig: new algosdk.modelsv2.SimulateTraceConfig({
          enable: true,
          scratchChange: true,
          stackChange: true,
          stateChange: true,
      }),
    });
    const simres = await atc.simulate(client, simreq);

    console.log(simres);
 
 
 
 
 const mn = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon invest';
const acct = algosdk.mnemonicToSecretKey(mn);
const signer = algosdk.makeBasicAccountTransactionSigner(acct);

const approval_b64 = "CTEYSIAgOM54YO9NPIFpGWulHHE7cVNZ0dbwigCRgyDrG94ypjJgFrCBAQ==";
const clear_b64 = "CYEB";

(async () => {
    const sp = await client.getTransactionParams().do();
    const txn = algosdk.makeApplicationCreateTxnFromObject({
        from: acct.addr,
        suggestedParams: sp,
        approvalProgram: new Uint8Array(Buffer.from(approval_b64, "base64")),
        clearProgram: new Uint8Array(Buffer.from(clear_b64, "base64")),
    });

    const atc = new algosdk.AtomicTransactionComposer;
    const tws = {
        txn: txn,
        signer: signer,
    };
    atc.addTransaction(tws);

    const simreq = new algosdk.modelsv2.SimulateRequest({
        allowEmptySignatures: true,
        allowUnnamedResources: true,
        execTraceConfig: new algosdk.modelsv2.SimulateTraceConfig({
            enable: true,
            scratchChange: true,
            stackChange: true,
            stateChange: true,
        }),
    });
    const simres = await atc.simulate(client, simreq);

    console.log(JSON.stringify(simres, null, 2));
})(); */
