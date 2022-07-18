/* A simple one-shot payout script for Polkadot
 * Copyright 2022 MIDL.dev
 *
 * This script requires a payout account with dust money to pay for transaction fees to call the payout extrinsic.
 *
 *  ########################################################
 *  ##                                                    ##
 *  ##  Want a simpler solution ?                         ##
 *  ##                                                    ##
 *  ##    https://MIDL.dev/polkadot-automated-payouts     ##
 *  ##                                                    ##
 *  ##  Kusama automated payouts for US$9.99 / month      ##
 *  ##  Polkadot automated payouts for US$19.99 / month   ##
 *  ##                                                    ##
 *  ########################################################
 *
 * All inputs come from environment variables:
 * 
 *  * NODE_ENDPOINT : the polkadot/kusama node rpc (localhost)
 *  * PAYOUT_ACOUNT_MNEMONIC: 12 words of the payout account (should have little balance, just for fees)
 *  * STASH_ACCOUNT_ADDRESS: the address of the validator's stash
 *  * STASH_ACCOUNT_ALIAS: an alias for your validator
 *  * NUM_PAST_ERAS: how many eras in the past to check for unpaid rewards
 *
 * The script queries the current era. It then verifies that:
 *
 *  * the previous era has not been paid yet
 *  * the validator was active in the previous era
 *
 *  When these conditions are met, it sends the payout extrinsic and exits.
 *
 *  If payout extrinsic fails, it will post an error to the console and to Slack
 *  if the SLACK_ALERT_TOKEN and SLACK_ALERT_CHANNEL env vars are set.
 *
 *  This script does not support multiple validators. To support multiple validators, run several cronjobs.
 *
 *  Payout for multiple eras in the past is supported, but will throw an error.
 *  This script is expected to run at least once per era.
 *
 *  To run once:
 *    export NODE_ENDPOINT=localhost
 *    export PAYOUT_ACCOUNT_MNEMONIC="your twelve key words..."
 *    export STASH_ACCOUNT_ADDRESS="GyrcqNwF87LFc4BRxhxakq8GZRVNzhGn3NLfSQhVHQxqYYx"
 *    export STASH_ACCOUNT_ALIAS="my awesome validator"
 *    export NUM_PAST_ERAS=5
 *    node index.js
 *
 *  To run continously, put the following script in a cronjob.
 *  See for reference: https://opensource.com/article/17/11/how-use-cron-linux
 * */

// Import the API
import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring, encodeAddress } from '@polkadot/keyring';
import { WebClient } from '@slack/web-api';
import '@polkadot/api-augment/kusama';
import '@polkadot/types';

async function sendErrorToSlackAndExit(message: string) {
  console.error(message);
  if (process.env.SLACK_ALERT_TOKEN) {
    const slackWeb = new WebClient(process.env.SLACK_ALERT_TOKEN!);
    await slackWeb.chat.postMessage({ text: message, channel: process.env.SLACK_ALERT_CHANNEL! })
  }
  process.exit(1)
}
async function main() {
  const provider = new WsProvider(`ws://${process.env.NODE_ENDPOINT!}:9944`);
  // Create our API
  const api = await ApiPromise.create({ provider });

  // Constuct the keying
  const keyring = new Keyring({ type: 'sr25519' });

  // Add the payout account to our keyring
  const payoutKey = keyring.addFromUri(process.env.PAYOUT_ACCOUNT_MNEMONIC!);

  const activeEra = (await api.query.staking.activeEra()).unwrapOrDefault()


  const stash_account = process.env.STASH_ACCOUNT_ADDRESS!;
  const stash_alias = process.env.STASH_ACCOUNT_ALIAS!; //optional
  const payout_alias = process.env.PAYOUT_ACCOUNT_ALIAS!; //optional
  const num_past_eras = parseInt(process.env.NUM_PAST_ERAS!);
  const chain = process.env.CHAIN;
  // https://wiki.polkadot.network/docs/build-ss58-registry
  const chain_ss58_prefix = (chain == "kusama") ? 2 : 0
  const payout_account = encodeAddress(payoutKey.address, chain_ss58_prefix);

  console.log(`Chain                          ${chain}`);
  console.log(`Stash account address          ${stash_account}`);
  console.log(`Stash account alias            ${stash_alias}`);
  console.log(`Payout account address         ${payout_account}`);
  console.log(`Payout account alias           ${payout_alias}`);
  console.log(`Number of past eras to pay out ${num_past_eras}`);
  console.log(`Node RPC endpoint in use       ${process.env.NODE_ENDPOINT}`);



  console.log(`Active Era is ${activeEra}`)
  let controller_address = await api.query.staking.bonded(stash_account);
  let controller_ledger = (await api.query.staking.ledger(controller_address.toString())).unwrapOrDefault()

  let claimed_eras = controller_ledger.claimedRewards.map(x => x.toNumber());
  console.log(`Payout for validator stash ${stash_alias} has been claimed for eras: ${claimed_eras}`);

  for (let i = 0; i < num_past_eras; i++) {
    let eraToClaim = activeEra.index.toNumber() - i - 1;
    if (claimed_eras.includes(eraToClaim)) {
      console.log(`Payout for validator stash ${stash_alias} for era ${eraToClaim} has already been issued`);
      continue;
    }

    const erasRewardsPoints = await api.query.staking.erasRewardPoints(eraToClaim)
    const thisValRewards = erasRewardsPoints.individual.toHuman()[stash_account]

    if (thisValRewards) {
      console.log(`Rewards of ${thisValRewards} found for validator for ${eraToClaim}.`)
    } else {
      console.log(`Stash ${stash_alias} was not in the active validator set for era ${eraToClaim}, no payout can be made`);
      continue;
    }


    if (i > 0) {
      var message = `Warning: Found and paid payouts more than one era in the past. Payout bot should run at least once per era. Please check your payout engine.`;
      if (process.env.SLACK_ALERT_TOKEN) {
        const slackWeb = new WebClient(process.env.SLACK_ALERT_TOKEN);
        const res = await slackWeb.chat.postMessage({ text: message, channel: process.env.SLACK_ALERT_CHANNEL! });
      }
      console.warn(message);
    }

    console.log(`Issuing payoutStakers extrinsic from address ${payout_alias} for validator stash ${stash_alias} for era ${eraToClaim}`);

    try {
      await api.tx.staking.payoutStakers(stash_account, eraToClaim).signAndSend(payoutKey, (async (result) => {
        let status = result.status;
        let events = result.events;
        console.log('Transaction status:', result.status.type);

        if (status.isInBlock) {
          console.log('Included at block hash', result.status.asInBlock.toHex());

          events.forEach((event: any) => {
            console.log('\t', event.toString());
          });
        } else if (status.isFinalized) {
          console.log('Finalized block hash', status.asFinalized.toHex());
          if (result.dispatchError) {
            let slackMessage = `Payout extrinsic was succesfully finalized on-chain but failed for validator ${stash_alias} (${stash_account}) with error ${status.asFinalized.toHex()}.`;
            sendErrorToSlackAndExit(slackMessage)
          } else {
            console.log("extrinsic success in finalized block, exiting")
            process.exit(0);
          }
        } else if (status.isInvalid || status.isDropped) {
          let slackMessage = `Vote extrinsic failed for validator ${stash_alias}(${stash_account}) with error ${status}.`;
          sendErrorToSlackAndExit(slackMessage);
        } else if (status.isRetracted) {
          // fail the job but do not alert. It is likely the transaction will go through at next try.
          process.exit(1)
        }
      }));
    }
    catch (e: any) {
      let slackMessage = `Payout extrinsic failed on-chain submission for validator ${stash_alias} from payout address ${payout_alias} with error ${e.message}.`;
      sendErrorToSlackAndExit(slackMessage);
    }
  }

  console.log("Exiting");
  process.exit(0);
}

main().catch(console.error);
