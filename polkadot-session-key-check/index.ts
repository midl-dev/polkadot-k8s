/* A script to verify session key.
 * Copyright 2022 MIDL.dev

 * All inputs come from environment variables:
 * 
 *  * NODE_ENDPOINT : the polkadot/kusama node rpc (localhost)
 *  * STASH_ACCOUNT_ADDRESS: the address of the validator's stash
 *  * STASH_ACCOUNT_ALIAS: an alias for your validator
 *
 *
 *  To run continously, put the following script in a cronjob.
 *  See for reference: https://opensource.com/article/17/11/how-use-cron-linux
 * */

// Import the API
import '@polkadot/types';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { WebClient } from '@slack/web-api';

async function main() {
  const provider = new WsProvider(`ws://${process.env.NODE_ENDPOINT}:9944`);
  // Create our API
  const api = await ApiPromise.create({ provider });


  const stash_account: string = process.env.STASH_ACCOUNT_ADDRESS!;
  const stash_alias = process.env.STASH_ACCOUNT_ALIAS; //optional
  // https://wiki.polkadot.network/docs/build-ss58-registry
  const currentBlockNum = (await api.rpc.chain.getHeader()).number;

  console.log("Polkadot Session Key Verificator by MIDL.dev");
  console.log("Copyright 2022 MIDLDEV OU");
  console.log("***");
  console.log(`Current block number:          ${currentBlockNum.toHuman()}`);
  console.log(`Stash account address:         ${stash_account}`);
  console.log(`Stash account alias:           ${stash_alias}`);
  console.log(`Node RPC endpoint in use:      ${process.env.NODE_ENDPOINT}`);
  let nextKeys = await api.query.session.nextKeys(stash_account);
  console.log(`Node's next keys: ${nextKeys}`);
  console.log(`Node's next keys in hex: ${nextKeys.toHex()}`);
  let nodeHasKeys = await api.rpc.author.hasSessionKeys(nextKeys.toHex());
  console.log(`Local node has the session keys necessary to validate: ${nodeHasKeys}`);
  if (nodeHasKeys.isFalse) {
    let message = `Node ${stash_alias} does not have the session keys advertised on-chain in local storage. Expected session key: ${nextKeys.toHex().substring(0, 12)}...`;
    console.error(message);
    const slackWeb = new WebClient(process.env.SLACK_ALERT_TOKEN!);
    await slackWeb.chat.postMessage({ text: message, channel: process.env.SLACK_ALERT_CHANNEL! })
  }
  console.log("Exiting");
  process.exit(0);
}

main().then(console.log).catch(console.error);
