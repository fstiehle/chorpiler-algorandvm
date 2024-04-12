import {expect} from 'chai';
import algosdk from "algosdk";
import fs from 'fs';
import path from 'path';
import { compileProgram } from '../util';
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