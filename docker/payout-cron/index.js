/* A simple one-shot payout script for Polkadot
 * Copyright 2020 MIDL.dev
 *
 * This script requires a payout account with dust money to pay for transaction fees to call the payout extrinsic.
 *
 * All inputs come from environment variables.
 *
 * The script queries the current era. It then verifies that:
 *
 *  * the previous era has not been paid yet
 *  * the validator was active in the previous era
 *
 *  When these conditions are met, it sends the payout extrinsic and exits. */

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

  const controller_address = await api.query.staking.bonded(process.env.STASH_ACCOUNT_ADDRESS);
  const controller_ledger = await api.query.staking.ledger(controller_address.toString());
  claimed_rewards = controller_ledger._raw.claimedRewards;

  if (claimed_rewards.includes(currentEra - 1)) {
    console.log(`Payout for validator stash ${process.env.STASH_ACCOUNT_ADDRESS} for era ${currentEra - 1} has already been issued, exiting`);
    process.exit(0);
  }

  const exposure_for_era = await api.query.staking.erasStakers(currentEra - 1, process.env.STASH_ACCOUNT_ADDRESS);
  if (exposure_for_era.total == 0) {
    console.log(`Stash ${process.env.STASH_ACCOUNT_ADDRESS} was not in the active validator set for era ${currentEra - 1}, not payout can be made, exiting`);
    process.exit(0);
  }

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
    } else if (status.isError) {
      console.error('Errored out in block hash', status.asFinalized.toHex());
      process.exit(1);
    }
  });
}

main().catch(console.error);
