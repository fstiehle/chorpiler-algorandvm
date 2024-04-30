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
const NR_NON_CONFORMING_TRACES = 10;
const parser = new chorpiler.utils.XESParser();

const client = new algosdk.Algodv2(algod.token, algod.server, algod.port);
const faucet = algosdk.mnemonicToSecretKey(FAUCET_MNEMONIC);

(async () => {

  const eventLogSC = await parser.fromXML(
    readFileSync(path.join(BPMN_PATH, 'cases', 'supply-chain', 'supply-chain.xes')));

  const eventLogIM = await parser.fromXML(
    readFileSync(path.join(BPMN_PATH, 'cases', 'incident-management', 'incident-management.xes')));

  describe('Test Execution of Cases', () => {

    describe.skip('Supply Chain Case', async () => {

      const processEncoding = ProcessEncoding.fromJSON(encodingSC);

      const teal = fs.readFileSync(
        path.join(OUTPUT_PATH, 'supply-chain', 'SC_ProcessExecution.teal'),
        'utf8'
      );

      testCase(
        eventLogSC,
        processEncoding,
        teal
      );

    });

    describe('Incident Management Case', async () => {

      const processEncoding = ProcessEncoding.fromJSON(encodingIM);
      

      const teal = fs.readFileSync(
        path.join(OUTPUT_PATH, 'incident-management', 'IM_ProcessExecution.teal'),
        'utf8'
      );

      testCase(
        eventLogIM, 
        processEncoding,
        teal
      );

    });
  }) 
})();

const testCase = (
  eventLog: EventLog,
  processEncoding: ProcessEncoding,
  tealCode: string
  ) => {

  describe('Replay Traces', async () => {

    let participants = new Map<string, algosdk.Account>();

    before(async () => {
      participants = await genFundAccounts(processEncoding.participants, faucet);

      // replace address placeholder
      for (let i = 0; i < participants.size; i++) {
        tealCode = tealCode.replace(`[ADDR_PAR_${i}]`, [...participants.values()][i].addr);
      }

      // debug
      fs.writeFileSync(path.join(OUTPUT_PATH, 'supply-chain', '1.teal'), tealCode, { flag: 'w+' });
    })

    // Requires a foreach to work: https://github.com/mochajs/mocha/issues/3074
    eventLog.traces.forEach((trace, i) => {

      let tokenState = 0;
      it(`Replay Conforming Trace ${i}`, async () => {
        const initiator = [...participants.values()].at(0)!;
        // account for min balance
        const [minBalance, numberOfApps] = await getMinBalance(initiator);
        // account for algos
        const initBal = (await client.accountInformation(initiator.addr).do()).amount;

        const appID = await deploy(client, initiator, tealCode);
        expect(appID).to.be.a("Number");

        // min balance
        const [minBalanceAfter, numberOfAppsAfter] = await getMinBalance(initiator);
        assert(numberOfApps + 1 === numberOfAppsAfter);
        // account for algos
        console.log("Deployment transaction cost", initBal - (await client.accountInformation(initiator.addr).do()).amount);
        console.log("Min-Balance Change", minBalance - minBalanceAfter);

        // replay trace
        for (const event of trace) {
          const participant = participants.get(event.source);
          const taskID = processEncoding.tasks.get(event.name);
          assert(participant !== undefined && taskID !== undefined,
            `source '${event.source}' event '${event.name}' not found`);

          // console.log(await getGlobalState(client, appID))
          tokenState = (await getGlobalState(client, appID)).uint;
          const suggestedParams = await client.getTransactionParams().do();

          //console.log(`source '${event.source}' event '${event.name}' cond '${event.cond}'`)

          const tx = algosdk.makeApplicationNoOpTxnFromObject({
            from: participant.addr,
            suggestedParams,
            appIndex: appID,
            appArgs: [algosdk.encodeUint64(taskID), algosdk.encodeUint64(Number(event.cond))], // not sure why we need to cast to number again
          });

          const simulation = await client.simulateRawTransactions([tx.signTxn(participant.sk)]).do();
          console.log("Budget Simulated", simulation.txnGroups[0].appBudgetConsumed);

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
            2 );

          // account for algos
          console.log("Transaction cost", parBal - (await client.accountInformation(participant.addr).do()).amount)
          const [minBalanceAfter, __] = await getMinBalance(participant);
          assert(minBalance - minBalanceAfter === 0);

          const newState = (await getGlobalState(client, appID)).uint;
          // Expect that tokenState has changed!
          expect(newState).to.not.equal(tokenState);
          tokenState = newState;
        }

        assert((await getGlobalState(client, appID)).uint === 0, "end event reached");
        // min balance
        // TODO: delete app
        console.log("end event reached");
        console.log("initiator balance change", minBalance - (await getMinBalance(initiator))[0]);
      });
    });

    const badLog = EventLog.genNonConformingLog(eventLog, processEncoding, NR_NON_CONFORMING_TRACES);

    // Requires a foreach to work: https://github.com/mochajs/mocha/issues/3074
    badLog.traces.forEach((trace, i) => {

      it(`Replay Non-Conforming Trace ${i}`, async () => {
        const appID = await deploy(client, faucet, tealCode);
        expect(appID).to.be.a("Number");

        let eventsRejected = 0;
        for (const event of trace) {
          const participant = participants.get(event.source);
          const taskID = processEncoding.tasks.get(event.name);
          assert(participant !== undefined && taskID !== undefined,
            `source '${event.source}' event '${event.name}' not found`);

          const suggestedParams = await client.getTransactionParams().do();
        
          const tx = algosdk.makeApplicationNoOpTxnFromObject({
            from: participant.addr,
            suggestedParams,
            appIndex: appID,
            appArgs: [algosdk.encodeUint64(taskID), algosdk.encodeUint64(Number(event.cond))],
          });

          try {
            const { txId } = await client
              .sendRawTransaction(tx.signTxn(participant.sk))
              .do()

            await algosdk.waitForConfirmation(
              client,
              txId,
              1 );

          } catch (e) {
              if ((e.message as string).includes("assert failed")) eventsRejected++;
          }

        }

        const finalState = await getGlobalState(client, appID)
        //console.log("finalState", finalState.uint)
        // Expect that tokenState has at least NOT changed once (one non-conforming event)
        // or end event has not been reached (if only an event was removed, but no non-conforming was added)
        assert( 
          eventsRejected > 0 || finalState.uint !== 0,
          "tokenState has at least NOT changed once or end event has not been reached"
        );
        //console.log("#rejected", eventsRejected)
      });
    });
  });
}

const genFundAccounts = async (participants: Map<string, number>, faucet: algosdk.Account) => {
  const accounts = new Map<string, algosdk.Account>()

  for (const id of participants.keys()) {
    const newAcc = algosdk.generateAccount();

    // from: https://developer.algorand.org/docs/sdks/javascript/#build-first-transaction
    const suggestedParams = await client.getTransactionParams().do();
    const tx = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: faucet.addr,
      suggestedParams,
      to: newAcc.addr,
      amount: 1000000
    })

    const signedTxn = tx.signTxn(faucet.sk);
    const { txId } = await client.sendRawTransaction(signedTxn).do();
    await algosdk.waitForConfirmation(client, txId, 2);

    accounts.set(id, newAcc);
  }

  return accounts;
}

async function getMinBalance(initiator: algosdk.Account) {
  const initInfo = await client.accountInformation(initiator.addr).do();
  return [initInfo['min-balance'], initInfo['total-created-apps']];
}
