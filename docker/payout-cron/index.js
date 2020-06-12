/* eslint-disable header/header */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/unbound-method */

// Import the API
const { ApiPromise, WsProvider } = require('@polkadot/api');
const { Keyring } = require('@polkadot/keyring');

async function main () {
  const provider = new WsProvider('ws://polkadot-sentry-node-0.polkadot-sentry-node:9944');
  // Create our API
  const api = await ApiPromise.create({ provider });

  // Constuct the keying
  const keyring = new Keyring({ type: 'sr25519' });

  // Add the payout account to our keyring
  const payoutKey = keyring.addFromUri(process.env.PAYOUT_ACCOUNT_MNEMONIC);

  const [currentEra] = await Promise.all([
    api.query.staking.currentEra()
  ]);

  console.log(`Issuing payoutStakers extrinsic from address ${process.env.PAYOUT_ACCOUNT_ADDRESS} for validator stash ${process.env.STASH_ACCOUNT_ADDRESS} for era ${currentEra - 1}`);

  // Create, sign and send the payoutStakers extrinsic
  const unsub = await api.tx.staking.payoutStakers(process.env.STASH_ACCOUNT_ADDRESS, currentEra - 1).signAndSend(payoutKey, ({ events = [], status }) => {
    console.log('Transaction status:', status.type);

    if (status.isInBlock) {
      console.log('Included at block hash', status.asInBlock.toHex());
      console.log('Events:');

      events.forEach(({ event: { data, method, section }, phase }) => {
        console.log('\t', phase.toString(), `: ${section}.${method}`, data.toString());
      });
    } else if (status.isFinalized) {
      console.log('Finalized block hash', status.asFinalized.toHex());
      process.exit(0);
    }
  });
}

main().catch(console.error);
