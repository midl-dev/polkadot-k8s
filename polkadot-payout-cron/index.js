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
const { ApiPromise, WsProvider } = require('@polkadot/api');
const { Keyring } = require('@polkadot/keyring');
const { WebClient, WebAPICallResult } = require('@slack/web-api');

async function main () {
  const provider = new WsProvider(`ws://${process.env.NODE_ENDPOINT}:9944`);
  // Create our API
  const api = await ApiPromise.create({ provider });

  // Constuct the keying
  const keyring = new Keyring({ type: 'sr25519' });

  // Add the payout account to our keyring
  const payoutKey = keyring.addFromUri(process.env.PAYOUT_ACCOUNT_MNEMONIC);

  const [currentEra] = await Promise.all([
    api.query.staking.currentEra()
  ]);


  const stash_account = process.env.STASH_ACCOUNT_ADDRESS;
  const stash_alias = process.env.STASH_ACCOUNT_ALIAS; //optional
  const num_past_eras = parseInt(process.env.NUM_PAST_ERAS);
  var controller_address = await api.query.staking.bonded(stash_account);
  var controller_ledger = await api.query.staking.ledger(controller_address.toString());
  claimed_eras = controller_ledger.toHuman().claimedRewards.map(x => parseInt(x.replace(',','')));
  console.log(`Payout for validator stash ${stash_account} has been claimed for eras: ${claimed_eras}`);

  for (i = 0; i < num_past_eras; i++) {
    eraToClaim = currentEra - 1 - i;

    if (claimed_eras.includes(eraToClaim)) {
      console.log(`Payout for validator stash ${stash_account} for era ${eraToClaim} has already been issued`);
      continue;
    }

    var exposure_for_era = await api.query.staking.erasStakers(eraToClaim, stash_account);
    if (exposure_for_era.total == 0) {
      console.log(`Stash ${stash_account} was not in the active validator set for era ${eraToClaim}, no payout can be made`);
      continue;
    }

    if (i > 0) {
      var message = `Warning: Found and paid payouts more than one era in the past. Payout bot should run at least once per era. Please check your payout engine.`;
      if(process.env.SLACK_ALERT_TOKEN) {
        const slackWeb = new WebClient(process.env.SLACK_ALERT_TOKEN);
        const res = await slackWeb.chat.postMessage({ text: message, channel: process.env.SLACK_ALERT_CHANNEL });
      }
      console.warn(message);
    }

    console.log(`Issuing payoutStakers extrinsic from address ${payoutKey.address} for validator stash ${stash_alias} (${stash_account}) for era ${eraToClaim}`);
  
    // Create, sign and send the payoutStakers extrinsic
    try {
      var unsub = await api.tx.staking.payoutStakers(stash_account, eraToClaim).signAndSend(payoutKey, ({ events = [], status }) => {
        console.log('Transaction status:', status.type);
  
        if (status.isInBlock) {
          console.log('Included at block hash', status.asInBlock.toHex());
          console.log('Events:');
  
          events.forEach(({ event: { data, method, section }, phase }) => {
            console.log('\t', phase.toString(), `: ${section}.${method}`, data.toString());
          });
        } else if (status.isFinalized) {
          console.log('Finalized block hash', status.asFinalized.toHex());
        } else if (status.isError) {
          var message = `Payout extrinsic was succesfully finalized on-chain but failed for validator ${stash_alias} (${stash_account}) with error ${status.asFinalized.toHex()}.`;
          if(process.env.SLACK_ALERT_TOKEN) {
            const slackWeb = new WebClient(process.env.SLACK_ALERT_TOKEN);
            const res = slackWeb.chat.postMessage({ text: message, channel: process.env.SLACK_ALERT_CHANNEL });
          }
          console.error(message);
          process.exit(1);
        }
      });
    }
    catch(e) {
      var message = `Payout extrinsic failed on-chain submission for validator ${stash_alias} (${stash_account}) with error ${e.message}.`;
      if(process.env.SLACK_ALERT_TOKEN) {
        const slackWeb = new WebClient(process.env.SLACK_ALERT_TOKEN);
        const res = (await slackWeb.chat.postMessage({ text: message, channel: process.env.SLACK_ALERT_CHANNEL }));
      }
      console.error(message);
      console.log(e);
      process.exit(1);
    }
  }
  console.log("Exiting");
  process.exit(0);
}

main().catch(console.error);
