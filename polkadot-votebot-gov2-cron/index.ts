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

const yaml = require('js-yaml');
const fs = require('fs');
const request = require('request');

async function sendErrorToSlackAndExit(message: string, exitWithFailure: boolean = true) {
  console.error(message);
  if (process.env.SLACK_ALERT_TOKEN) {
    const slackWeb = new WebClient(process.env.SLACK_ALERT_TOKEN!);
    await slackWeb.chat.postMessage({ text: message, channel: process.env.SLACK_ALERT_CHANNEL! })
  }
  const exitCode = exitWithFailure ? 1 : 0;
  process.exit(exitCode);
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
  console.log("Copyright 2023 MIDLDEV OU");
  console.log("***");
  console.log(`Chain:                         ${chain}`);
  console.log(`Current block number:          ${currentBlockNum.toHuman()}`);
  console.log(`Stash account address:         ${stash_account}`);
  console.log(`Stash account alias:           ${stash_alias}`);
  console.log(`Voting proxy account address:  ${voteBot_account}`);
  console.log(`Voting proxy account alias:    ${vote_bot_alias}`);
  console.log(`Vote balance in nanodot:       ${voteBalance.toString()}`);
  console.log(`Node RPC endpoint in use:      ${process.env.NODE_ENDPOINT}`);

  // list of error codes that would allow the job to exit without failure
  const exitWithoutFailureErrorCodes: number[] = [1010];

  let valVotes: number[] = [];

  const govTracks = api.consts.referenda.tracks;
  let classOfValVotes: { [key: number]: any } = {}
  for (const govTrackEntry of govTracks) {
    let rawValVotes: number[] = await api.query.convictionVoting.votingFor(stash_account_address, govTrackEntry[0]).then(q => JSON.parse(JSON.stringify(q))["casting"]["votes"].map((v: any) => v[0]))
    console.log(`Existing votes for track ${govTrackEntry[0]} (${govTrackEntry[1]["name"]}): ${rawValVotes}`)
    rawValVotes.forEach((v: number) => {
      classOfValVotes[v] = govTrackEntry[0].toNumber()
      valVotes.push(v)
    })
  }
  // TODO: grab the duration per gov track, the estimated time before finishing for every referendum,
  // send a slack alert when a referendum is set to expire

  let refCount = await api.query.referenda.referendumCount();
  var referenda: any = [];
  let ongoingRefs: any[] = [];
  let i: number = refCount.toNumber();
  let trigger = 0;
  if (i) {
    while (true) {
      i = i - 1;
      if (i == 0) {
        break;
      }
      var rawR = await api.query.referenda.referendumInfoFor(i);
      let r = JSON.parse(JSON.stringify(rawR));

      if ("ongoing" in r) {
        r["number"] = i;
        ongoingRefs.push(i);
        if (valVotes.includes(i)) {
          console.log(`Validator ${stash_alias} has already voted for current referendum ${i}.`);
        } else {
          console.log(`Validator ${stash_alias} must vote for current referendum ${i}.`);
          referenda.push(r);
        }
        trigger = 0;
      } else {
        trigger += 1;
        if (trigger > 5) {
          // assuming that if we see 5 completed referedums in a row, we are done (empirical)
          break;
        }
      }
    }
  }

  // Load votes from external file
  const url = `https://raw.githubusercontent.com/${process.env.VOTE_REPO}/main/${chain}-gov2.yaml`;
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

  let attemptDeletion: boolean = false;
  if (referenda.length == 0) {
    console.log("All up-to-date with voting.")
    attemptDeletion = true;
  } else {
    let r = referenda[referenda.length - 1];
    if (!(r["number"] in votes)) {
      let errorMsg = `Recommendation for gov2 vote ${r["number"]} has not yet been committed to ${url}. Please commit a recommendation.`;
      console.error(errorMsg);
      attemptDeletion = true;
    } else {
      i = r["number"];
      console.log(`Voting ${votes[i]["vote"]} for referendum ${i}. Reason:`);
      console.log(votes[i]["reason"]);
      let isAye: boolean = (votes[i]["vote"] == "aye" || votes[i]["vote"] == "yay");

      let vote = {
        Standard: {
          vote: {
            aye: isAye,
            conviction: 'None',
          },
          balance: voteBalance,
        }
      };
      console.log(`IsAye ${isAye}`);

      try {
        await api.tx.proxy.proxy(stash_account, "Governance", api.tx.convictionVoting.vote(i, vote)).signAndSend(voteBotKey, (async (result) => {
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
              let slackMessage = `Gov2 Vote extrinsic failed on-chain submission for validator ${stash_alias} from vote address ${vote_bot_alias} with error ${result.dispatchError}, check subscan, txhash ${status.asFinalized.toHex()}`;
              sendErrorToSlackAndExit(slackMessage)
            } else {
              console.log("extrinsic success in finalized block, exiting")
              process.exit(0);
            }
          } else if (status.isInvalid || status.isDropped) {
            let slackMessage = `Gov2 Vote extrinsic failed for validator ${stash_alias}(${stash_account}) with error ${status}.`;
            sendErrorToSlackAndExit(slackMessage);
          } else if (status.isRetracted) {
            // fail the job but do not alert. It is likely the transaction will go through at next try.
            process.exit(1)
          }
        })
      } catch (e: any) {
        const error_message: string = e.message
        // If the error code not in exitWithoutFailureErrorCodes, exit with failure.
        const exitWithFaiilure = exitWithoutFailureErrorCodes.indexOf(e.code) < 0 ? true : false
        const slackMessage = `Gov2 Vote extrinsic failed on - chain submission for validator ${stash_alias} from vote address \`${voteBot_account}\` with error ${error_message}.`
        sendErrorToSlackAndExit(slackMessage, exitWithFaiilure)
      }
    }
  }

  if (attemptDeletion) {
    if (valVotes.length > 0) {
      console.log("Checking for expired referenda to remove...");
      console.log(`ValVotes: ${valVotes} `)
      console.log(`ongoingRefs: ${ongoingRefs} `)
      let oldVote: number | undefined;
      // Lazily removing one old vote (starting with oldest), so democracy bond can be unlocked easily if needed.
      valVotes.forEach(e => {
        if (!ongoingRefs.includes(e)) {
          oldVote = e;
        }
      })
      if (oldVote) {
        console.log(`Now attempting to remove vote for referendum ${oldVote} of class ${classOfValVotes[oldVote!]}, since referendum has expired. Exit immediately after sending extrinsic without catching any failures.`)
        try {
          await api.tx.proxy.proxy(stash_account, "Governance", api.tx.convictionVoting.removeVote(classOfValVotes[oldVote!], oldVote!)).signAndSend(voteBotKey, (async (result) => {
            console.log('Transaction status:', result.status.type);
            let status = result.status;
            if (status.isInBlock) {
              console.log('Included at block hash', result.status.asInBlock.toHex());
              process.exit(0);
            }
          }))
        }
        catch (e: any) {
          // exit without any failures for all errors, just post to slack
          const exitWithFaiilure = false;
          const error_message: string = e.message;
          let slackMessage = `Gov2 Vote extrinsic failed on - chain submission for validator ${stash_alias} from vote address `${voteBot_account}` with error ${error_message}.`;
          sendErrorToSlackAndExit(slackMessage, exitWithFaiilure);
        }
      } else {
        console.log("No expired referenda, exiting.")
        process.exit(0);
      }
    }
  }
}

main().then(console.log).catch(console.error);
