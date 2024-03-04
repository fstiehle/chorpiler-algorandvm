import {assert, expect} from 'chai';
import algosdk from "algosdk";
import fs from 'fs';
import path from 'path';

const token = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const server = 'http://127.0.0.1';
const port = 4001;
const client = new algosdk.Algodv2(token, server, port);
const tealTest = fs.readFileSync(
  path.join(__dirname, 'test.teal'),
  'utf8'
);
const tealTemplate = fs.readFileSync(
  path.join(__dirname, 'template.teal'),
  'utf8'
);

describe('Test Sandbox', () => {  

  it("Is Sandbox up",  async () => { 
    await client.status().do().catch((e) => {
      console.log(e);
      assert(false, "Could not ask client status");
    });
  });

  it("Compile test.teal",  async () => { 

    await client.compile(Buffer.from(tealTest)).do()
    .catch((e) => {
      console.log(e);
      assert(false, "Could not compile via client");
    })
    .then((r) => {
      expect(r).has.property("hash");
      expect(r).has.property("result");
    });

  });

  it("Compile template.teal",  async () => { 

    await client.compile(Buffer.from(tealTemplate)).do()
    .catch((e) => {
      console.log(e);
      assert(false, "Could not compile via client");
    })
    .then((r) => {
      expect(r).has.property("hash");
      expect(r).has.property("result");
    });

  });

 /*  const mn = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon invest';
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

});