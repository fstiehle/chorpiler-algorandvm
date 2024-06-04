import {expect} from 'chai';
import algosdk from "algosdk";
import fs from 'fs';
import path from 'path';
import { compileProgram, getGlobalState, sendPayment } from '../util';
import { TEAL_PATH, algod } from '../config';

const FAUCET_MNEMONIC = process.env.FAUCET_MNEMONIC!;

const client = new algosdk.Algodv2(algod.token, algod.server, algod.port);
const acct = algosdk.mnemonicToSecretKey(FAUCET_MNEMONIC);

let appID = 0;

const tealTest = fs.readFileSync(
  path.join(TEAL_PATH, 'test.teal'),
  'utf8'
);

const tealTemplate = fs.readFileSync(
  path.join(TEAL_PATH, 'template.teal'),
  'utf8'
);

const tealWithArgs = fs.readFileSync(
  path.join(TEAL_PATH, 'args.teal'),
  'utf8'
);

const bytePackage = fs.readFileSync(
  path.join(TEAL_PATH, 'bytePackage.teal'),
  'utf8'
);

const boxPackage = fs.readFileSync(
  path.join(TEAL_PATH, 'boxPackage.teal'),
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
    //console.log(appID);

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
    
    //console.log(res);

  });

});


describe('Test passing args to contract', () => {

  const contractArgs = [algosdk.encodeUint64(0)];

  before("Compile & Deploy",  async () => { 

    const suggestedParams = await client.getTransactionParams().do();
    const appCreateTxn = algosdk.makeApplicationCreateTxn(
      acct.addr, 
      suggestedParams, 
      algosdk.OnApplicationComplete.NoOpOC, 
      await compileProgram(client, tealWithArgs),
      await compileProgram(client, tealTest),
      0, 0, 1, 0);

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
    //console.log(appID);

  });

  it('send tx with args', async () => {

    const suggestedParams = await client.getTransactionParams().do();
    const tx = algosdk.makeApplicationNoOpTxn(acct.addr, suggestedParams, appID, contractArgs);

    await client
      .sendRawTransaction(tx.signTxn(acct.sk))
      .do();

    const res = await algosdk.waitForConfirmation(
      client,
      tx.txID().toString(),
      2 )

    //console.log(res);

  });

});

describe('Test byte packaging', () => {

  const contractArgs = [algosdk.encodeUint64(0)];

  before("Compile & Deploy",  async () => { 

    const suggestedParams = await client.getTransactionParams().do();
    const appCreateTxn = algosdk.makeApplicationCreateTxn(
      acct.addr, 
      suggestedParams, 
      algosdk.OnApplicationComplete.NoOpOC, 
      await compileProgram(client, bytePackage),
      await compileProgram(client, tealTest),
      0, 0, 2, 1);

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

    //console.log(await getGlobalState(client, appID))

  });

  it('send tx with args', async () => {

    const tx = algosdk.makeApplicationNoOpTxn(
      acct.addr, 
      await client.getTransactionParams().do(), 
      appID, 
      [algosdk.encodeUint64(2)]
    );

    await client
      .sendRawTransaction(tx.signTxn(acct.sk))
      .do();

    const res = await algosdk.waitForConfirmation(
      client,
      tx.txID().toString(),
      2 )

    //console.log(res);
    /* console.log(await getGlobalState(client, appID))

    const bytes = (await getGlobalState(client, appID)).byte as Buffer
    const hex = Buffer.from('0000000000000001', 'hex');
    console.log(hex.readBigUint64BE(0));
    console.log(bytes)

    const array = new Array<Uint8Array>();
    let j = 0;
    for (let i = 0; i < bytes.length; i=i+8) {
 
      const number = bytes.readBigUint64BE(i);
      console.log(number)
 
    } */

  });
});

describe('Test box packaging', () => {

  const contractArgs = [algosdk.encodeUint64(0)];

  before("Compile & Deploy",  async () => { 

    const suggestedParams = await client.getTransactionParams().do();
    const appCreateTxn = algosdk.makeApplicationCreateTxn(
      acct.addr, 
      suggestedParams, 
      algosdk.OnApplicationComplete.NoOpOC, 
      await compileProgram(client, boxPackage),
      await compileProgram(client, tealTest),
      0, 0, 0, 0);

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

    const appAddr = algosdk.getApplicationAddress(appID);
    //console.log("balance before", balanceBefore);

    // we need an extra tx for this
    const payTx = await sendPayment(client, acct, appAddr, 1000000);
    await algosdk.waitForConfirmation(client, payTx, 12);
    
    
    //console.log(await getGlobalState(client, appID))

  });

  it('send tx with args', async () => {

    const tx = algosdk.makeApplicationNoOpTxnFromObject({
      from: acct.addr,
      suggestedParams: await client.getTransactionParams().do(),
      appIndex: appID,
      appArgs: [new Uint8Array(0)],
      boxes: [
        {appIndex: appID, name: new Uint8Array(Buffer.from('s'))}
      ],
    });

    await client
      .sendRawTransaction(tx.signTxn(acct.sk))
      .do();

    const res = await algosdk.waitForConfirmation(
      client,
      tx.txID().toString(),
      2 )

    //console.log(res);
    const b = await client.getApplicationBoxByName(appID, new Uint8Array(Buffer.from('s'))).do()
    const bytes = b.value.buffer
    const hex = Buffer.from('0000000000000001', 'hex');
    //console.log(hex.readBigUint64BE(0));
    //console.log(bytes)

    //console.log(arrayBufferToBigInt64Array(bytes))

  });
});

function arrayBufferToBigInt64Array(buffer: ArrayBufferLike): BigInt64Array {
  const dataView = new DataView(buffer);
  const length = buffer.byteLength / 8; // Calculate number of 64-bit integers
  const result = new BigInt64Array(length);

  for (let i = 0; i < length; i++) {
      result[i] = dataView.getBigInt64(i * 8, false); // Read Big Endian 64-bit integer
  }

  return result;
}