/**
 * Test correctness of process execution by replaying logs
 */
import { assert, expect } from "chai";
import { readFileSync } from 'fs';
import path from "path";
import fs from 'fs';

import encodingSC from '../data/generated/supply-chain/SC_ProcessExecution_encoding.json';
import encodingIM from '../data/generated/incident-management/IM_ProcessExecution_encoding.json';
import chorpiler, { ProcessEncoding } from "chorpiler";
import { BPMN_PATH, OUTPUT_PATH, algod } from "../config";
import { EventLog } from "chorpiler/lib/util/EventLog";
import algosdk from "algosdk";
import { getGlobalState, deploy } from "../util";

const FAUCET_MNEMONIC = process.env.FAUCET_MNEMONIC!;
const parser = new chorpiler.utils.XESParser();

const client = new algosdk.Algodv2(algod.token, algod.server, algod.port);
const faucet = algosdk.mnemonicToSecretKey(FAUCET_MNEMONIC);

(async () => {

  const eventLogSC = await parser.fromXML(
    readFileSync(path.join(BPMN_PATH, 'cases', 'supply-chain', 'supply-chain.xes')));

  const eventLogIM = await parser.fromXML(
    readFileSync(path.join(BPMN_PATH, 'cases', 'incident-management', 'incident-management.xes')));

  describe('Test Execution of Byte Multi-Instance', () => {

    describe('Supply Chain Case', () => {

      const processEncoding = ProcessEncoding.fromJSON(encodingSC);

      const teal_byteInstance = fs.readFileSync(
        path.join(OUTPUT_PATH, 'supply-chain', 'SC_ByteInstanceExecution.teal'),
        'utf8'
      );

      testMultiInstance(
        eventLogSC,
        processEncoding,
        teal_byteInstance
      );

    });

    describe('Incident Management Case', () => {

      const processEncoding = ProcessEncoding.fromJSON(encodingIM);

      const teal_byteInstance = fs.readFileSync(
        path.join(OUTPUT_PATH, 'incident-management', 'IM_ByteInstanceExecution.teal'),
        'utf8'
      );

      testMultiInstance(
        eventLogIM,
        processEncoding,
        teal_byteInstance
      );

    });
  }) 
})();

const testMultiInstance = (
  eventLog: EventLog,
  processEncoding: ProcessEncoding,
  tealCode: string
  ) => {

  describe('Replay Multi Instance Traces', () => {

    let participants = new Map<string, algosdk.Account>();

    before(async () => {
      participants = await genFundAccounts(processEncoding.participants, faucet);

      // replace address placeholder
      for (let i = 0; i < participants.size; i++) {
        tealCode = tealCode.replace(`[ADDR_PAR_${i}]`, [...participants.values()][i].addr);
      }

      // debug
      fs.writeFileSync(path.join(OUTPUT_PATH, 'supply-chain', '2.teal'), tealCode, { flag: 'w+' });
    })

    // Requires a foreach to work: https://github.com/mochajs/mocha/issues/3074
    eventLog.traces.forEach((trace, i) => {
      let tbudget = 0;
      let tcost = 0;
      let tokenState = Buffer.alloc(0);
      it(`Replay Conforming Trace ${i} on all instances`, async () => {
        const initiator = [...participants.values()].at(0)!;
        // account for min balance
        const [minBalance, numberOfApps] = await getMinBalance(initiator);
        // account for algos
        const initBal = (await client.accountInformation(initiator.addr).do()).amount;

        const appID = await deploy(client, initiator, tealCode, 0, 1);
        expect(appID).to.be.a("Number");

        // min balance
        const [minBalanceAfter, numberOfAppsAfter] = await getMinBalance(initiator);
        assert(numberOfApps + 1 === numberOfAppsAfter);
        // account for algos
        tcost += initBal - (await client.accountInformation(initiator.addr).do()).amount
        console.log("\tDeployment transaction cost", tcost);
        //console.log("\tMin-Balance Change", minBalance - minBalanceAfter);

        // replay trace
        for (const event of trace) {
          const participant = participants.get(event.source);
          const taskID = processEncoding.tasks.get(event.name);
          assert(participant !== undefined && taskID !== undefined,
            `source '${event.source}' event '${event.name}' not found`);

          // console.log(await getGlobalState(client, appID))
          tokenState = (await getGlobalState(client, appID)).byte as Buffer;
          //console.log("Before")
          //console.log(readBigUint64BEArray(tokenState))
          const suggestedParams = await client.getTransactionParams().do();

          //console.log(`source '${event.source}' event '${event.name}' cond '${event.cond}'`)

          const budget = new Array<number>(16).fill(0);
          const txcost = new Array<number>(16).fill(0);
          for (let case_id = 0; case_id < 16; case_id++) {
            
            const tx = algosdk.makeApplicationNoOpTxnFromObject({
              from: participant.addr,
              suggestedParams,
              appIndex: appID,
              appArgs: [
                algosdk.encodeUint64(taskID), 
                algosdk.encodeUint64(Number(event.cond)), // not sure why we need to cast to number again
                algosdk.encodeUint64(case_id)], 
            });

            const simulation = await client.simulateRawTransactions([tx.signTxn(participant.sk)]).do();
            budget[taskID] += (Number(simulation.txnGroups[0].appBudgetConsumed));

            // account for algos
            const parBal = (await client.accountInformation(participant.addr).do()).amount;
            // account for min balance
            const [minBalance, _] = await getMinBalance(participant);

            const { txId } = await client
              .sendRawTransaction(tx.signTxn(participant.sk))
              .do();

            await algosdk.waitForConfirmation(
              client,
              txId,
              16 );

            // account for algos
            txcost[taskID] += parBal - (await client.accountInformation(participant.addr).do()).amount
            //console.log("Transaction cost", parBal - (await client.accountInformation(participant.addr).do()).amount)
            const [minBalanceAfter, __] = await getMinBalance(participant);
            assert(minBalance - minBalanceAfter === 0);

            const newState = (await getGlobalState(client, appID)).byte as Buffer;
            //console.log(readBigUint64BEArray(newState));
            // Expect that tokenState has changed!
            expect(newState).to.not.eql(tokenState);
            tokenState = newState;
          }

          tcost += txcost[taskID] / 16;
          tbudget += budget[taskID] / 16;
        }

        console.log("\t Executed Tasks", trace.events.length)
        console.log("\t Avg budget", tbudget / trace.events.length)
        console.log("\t Tx cost", tcost)

        const endState = (await getGlobalState(client, appID)).byte as Buffer
        const markings = readBigUint64BEArray(endState);
        markings.forEach((m) => {
          assert(Number(m) === 0, "end event reached");
        })
        //assert((await getGlobalState(client, appID)).byte === 0, "end event reached");
        // min balance
        console.log("\t initiator balance change", minBalance - (await getMinBalance(initiator))[0]);
      });
    });
  });
}

// Helper function to convert a base64 string to a Uint8Array
function readBigUint64BEArray(bytes: Buffer): BigInt[] {
  const numbers: BigInt[] = [];
  for (let i = 0; i < bytes.length; i += 8) {
      const number = bytes.readBigUInt64BE(i);
      numbers.push(number);
  }
  return numbers;
}

const genFundAccounts = async (participants: Map<string, number>, faucet: algosdk.Account) => {
  const accounts = new Map<string, algosdk.Account>();

  for (const id of participants.keys()) {
    const newAcc = algosdk.generateAccount();

    // from: https://developer.algorand.org/docs/sdks/javascript/#build-first-transaction
    const suggestedParams = await client.getTransactionParams().do();
    const tx = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: faucet.addr,
      suggestedParams,
      to: newAcc.addr,
      amount: 100000000
    })

    const signedTxn = tx.signTxn(faucet.sk);
    const { txId } = await client.sendRawTransaction(signedTxn).do();
    await algosdk.waitForConfirmation(client, txId, 16);

    accounts.set(id, newAcc);
  }

  return accounts;
}

async function getMinBalance(initiator: algosdk.Account) {
  const initInfo = await client.accountInformation(initiator.addr).do();
  return [initInfo['min-balance'], initInfo['total-created-apps']];
}
