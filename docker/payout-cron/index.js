/* eslint-disable header/header */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/unbound-method */

// Import the API
const { ApiPromise, WsProvider } = require('@polkadot/api');
const { Keyring } = require('@polkadot/keyring');

async function main () {
  const provider = new WsProvider('ws://polkadot-sentry-node-0:9944');
  // Create our API
  const api = await ApiPromise.create({ provider });

  // Constuct the keying
  const keyring = new Keyring({ type: 'sr25519' });

  // Add the payout account to our keyring
  const payoutKey = keyring.addFromUri(process.env.PAYOUT_ACCOUNT_MNEMONIC);

  const [currentEra] = await Promise.all([
    api.query.staking.currentEra()
  ]);

  console.log(`Issuing payoutStakers extrinsic from address ${process.env.PAYOUT_ACCOUNT_ADDRESS} for era ${currentEra - 1}`);

  // Create the extrinsic
  const transfer = api.tx.staking.payoutStakers(process.env.PAYOUT_ACCOUNT_ADDRESS, currentEra - 1);

  // Sign and send the transaction using our account
  const hash = await transfer.signAndSend(payoutKey);

  console.log('Payout operation sent sent with hash', hash.toHex());

}

main().catch(console.error).finally(() => process.exit());
