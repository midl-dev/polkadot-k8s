/* A simple one-shot voteBot script for Polkadot
 * Copyright 2022 MIDL.dev

 * All inputs come from environment variables:
 * 
 *  * NODE_ENDPOINT : the polkadot/kusama node rpc (localhost)
 *  * PROXY_ACOUNT_MNEMONIC: 12 words of the account for which the stash has delegated Governance rights via proxy (should have little balance, just for fees)
 *  * STASH_ACCOUNT_ADDRESS: the address of the validator's stash
 *  * STASH_ACCOUNT_ALIAS: an alias for your validator
 *  * VOTE_REPO: the github repository where your vote choices are kept in yaml format, for example midl-dev/dotsama-votes
 *
 * The script queries the current referendums, then try to vote for the oldest unvoted referendum. It does not vote for all. To do this, run this script several times.
 *
 *  If voting extrinsic fails, it will post an error to the console and to Slack
 *
 *  To run continously, put the following script in a cronjob.
 *  See for reference: https://opensource.com/article/17/11/how-use-cron-linux
 * */

// Import the API
import '@polkadot/api-augment/kusama';
import '@polkadot/types';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring, encodeAddress } from '@polkadot/keyring';
import { WebClient } from '@slack/web-api';
//import { FrameSystemAccountInfo } from '@polkadot/types/lookup';
const yaml = require('js-yaml');
const fs = require('fs');
const request = require('request');

async function sendErrorToSlackAndExit(message: string) {
  console.error(message);
  if (process.env.SLACK_ALERT_TOKEN) {
    const slackWeb = new WebClient(process.env.SLACK_ALERT_TOKEN!);
    await slackWeb.chat.postMessage({ text: message, channel: process.env.SLACK_ALERT_CHANNEL! })
  }
  process.exit(1)
}
async function main() {
  const provider = new WsProvider(`ws://${process.env.NODE_ENDPOINT}:9944`);
  // Create our API
  const api = await ApiPromise.create({ provider });

  // Constuct the keying
  const keyring = new Keyring({ type: 'sr25519' });

  // Add the voteBot account to our keyring
  const voteBotKey = keyring.addFromUri(process.env.PROXY_ACCOUNT_MNEMONIC!);

  const stash_account: string = process.env.STASH_ACCOUNT_ADDRESS!;
  const stash_alias = process.env.STASH_ACCOUNT_ALIAS; //optional
  const vote_bot_alias = process.env.PROXY_ACCOUNT_ALIAS; //optional
  const chain = process.env.CHAIN;
  // https://wiki.polkadot.network/docs/build-ss58-registry
  const chain_ss58_prefix = (chain == "kusama") ? 2 : 0
  const voteBot_account = encodeAddress(voteBotKey.address, chain_ss58_prefix);
  const stash_account_address = encodeAddress(stash_account, chain_ss58_prefix);
  const voteBalance = (await api.query.system.account(stash_account_address)).data.free.toBigInt() - BigInt(100000000);
  const currentBlockNum = (await api.rpc.chain.getHeader()).number;

  // will send an alert when the referendum is this close to finishing, and
  // recommendation still hasn't been committed to the repo.
  const DEADLINE_WARNING_NUM_BLOCKS: BigInt = BigInt(15000);

  console.log("Polkadot Vote Bot by MIDL.dev");
  console.log("Copyright 2022 MIDLDEV OU");
  console.log("***");
  console.log(`Chain:                         ${chain}`);
  console.log(`Current block number:          ${currentBlockNum.toHuman()}`);
  console.log(`Stash account address:         ${stash_account}`);
  console.log(`Stash account alias:           ${stash_alias}`);
  console.log(`Voting proxy account address:  ${voteBot_account}`);
  console.log(`Voting proxy account alias:    ${vote_bot_alias}`);
  console.log(`Vote balance in nanodot:       ${voteBalance.toString()}`);
  console.log(`Node RPC endpoint in use:      ${process.env.NODE_ENDPOINT}`);
  let rawValVotes = await api.query.democracy.votingOf(stash_account);
  let valVotes = JSON.parse(JSON.stringify(rawValVotes));


  valVotes = valVotes["direct"]["votes"].map((v: any) => v[0]);
  console.log(`Validator ${stash_alias} already voted for referenda ${valVotes}.`);

  let refCount = await api.query.democracy.referendumCount();
  var referenda: any = [];
  let ongoingRefs = [];
  let i: number = refCount.toU8a()[0];
  if (i) {
    while (true) {
      i = i - 1;
      var rawR = await api.query.democracy.referendumInfoOf(i);
      let r = JSON.parse(JSON.stringify(rawR));

      if ("ongoing" in r) {
        r["number"] = i;
        ongoingRefs.push(i);
        console.log(`Current referenum ${i} found, ending at block ${r["ongoing"]["end"]}`);
        if (valVotes.includes(i)) {
          console.log(`But validator ${stash_alias} has already voted for referendum ${i}.`);
        } else {
          referenda.push(r);
        }
      } else {
        break;
      }
    }
  }

  if (referenda.length == 0) {
    if (valVotes.length > 0) {
      console.log("All up-to-date with voting. Checking for expired referenda to remove...");
      // Lazily removing one old vote (starting with oldest), so democracy bond can be unlocked easily if needed.
      let e = valVotes[0];
      if (!ongoingRefs.includes(e)) {
        console.log(`Now attempting to remove vote for referendum ${e}, since referendum has expired.`)
        await api.tx.proxy.proxy(stash_account, "Governance", api.tx.democracy.removeVote(e)).signAndSend(voteBotKey, (async (result) => {
          console.log('Transaction status:', result.status.type);
          let status = result.status;
          if (status.isInBlock) {
            console.log('Included at block hash', result.status.asInBlock.toHex());
            process.exit(0);
          }
        }))
      } else {
        console.log("No expired referenda, exiting.")
      }
    }
    process.exit(0);
  }

  // Load votes from external file
  const url = `https://raw.githubusercontent.com/${process.env.VOTE_REPO}/main/${chain}.yaml`;
  const getVotes = (url: string) => {
    return new Promise((resolve, reject) => {
      request.get(url, (error: any, response: any, body: any) => {
        if (!error && response.statusCode == 200) {
          return resolve(body);
        }
        return reject({
          message: "Invalid URL!",
          stack: error ? error.stack : null
        });
      });
    });
  }
  const votes = yaml.load(await getVotes(url));

  let r = referenda[referenda.length - 1];
  i = r["number"];
  if (!(i in votes)) {
    let blocksBeforeDeadline = BigInt(r["ongoing"]["end"]) - currentBlockNum.toBigInt();
    let errorMsg = `Recommendation for vote ${i} has not yet been committed to ${url}. Referendum ${i} will end in ${blocksBeforeDeadline} blocks, please commit a recommendation.`;
    if (blocksBeforeDeadline < DEADLINE_WARNING_NUM_BLOCKS) {
      await sendErrorToSlackAndExit(errorMsg);
    } else {
      console.error(errorMsg);
      console.log(`We will send an alert when we are less than ${DEADLINE_WARNING_NUM_BLOCKS} before the referendum end`);
      process.exit(0);
    }
  }
  console.log(`Voting ${votes[i]["vote"]} for referendum ${i}. Reason:`);
  console.log(votes[i]["reason"]);
  let isAye: boolean = (votes[i]["vote"] == "aye");

  let vote = {
    Standard: {
      vote: {
        aye: isAye,
        conviction: 'None',
      },
      balance: voteBalance,
    }
  };

  try {
    await api.tx.proxy.proxy(stash_account, "Governance", api.tx.democracy.vote(i, vote)).signAndSend(voteBotKey, (async (result) => {
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
          let slackMessage = `Vote extrinsic failed on-chain submission for validator ${stash_alias} from vote address ${vote_bot_alias} with error ${result.dispatchError}, check subscan, txhash ${status.asFinalized.toHex()}`;
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
    const error_message: string = e.message;
    let slackMessage = `Vote extrinsic failed on - chain submission for validator ${stash_alias} from vote address ${vote_bot_alias} with error ${error_message}.`;
    sendErrorToSlackAndExit(slackMessage);
  }
}

main().then(console.log).catch(console.error);
