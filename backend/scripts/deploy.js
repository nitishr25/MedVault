// scripts/deploy.js

import hre from 'hardhat';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('Starting MedVault deployment...');

  if (!hre.ethers) {
    throw new Error(
      'Hardhat Ethers plugin is uninitialized. ' +
      'Check that @nomicfoundation/hardhat-ethers is listed in hardhat.config.js.'
    );
  }

  // 1. Deploy MedVault
  const MedVault = await hre.ethers.getContractFactory('MedVault');
  const medVault = await MedVault.deploy();
  await medVault.waitForDeployment();

  const contractAddress = await medVault.getAddress();
  console.log(`MedVault deployed to: ${contractAddress}`);

  const signers = await hre.ethers.getSigners();

  // Account #0 — systemOwner/HospitalAdmin (auto-registered by constructor)
  const adminWallet  = signers[0];

  // Account #1 — backend relayer, registered as Patient
  // This is the address whose private key goes into RELAYER_PRIVATE_KEY in .env
  const relayerWallet  = signers[1];
  const relayerAddress = relayerWallet.address;

  console.log(`Admin wallet   : ${adminWallet.address}  (HospitalAdmin — set by constructor)`);
  console.log(`Relayer wallet : ${relayerAddress}  (will be registered as Patient)`);

  // 2. Register Account #1 as Patient via registerUser(), called by Account #0 (Admin)
  //
  // WHY NOT Account #0?
  // The constructor already registers msg.sender (Account #0) as HospitalAdmin.
  // Calling registerUser(account0, Patient) would revert with "already active"
  // because isRegistered[account0] is already true.
  // Account #1 is clean — never touched by the constructor.
  //
  // WHY registerUser() and not registerRole()?
  // registerRole() is self-registration (msg.sender registers themselves).
  // registerUser() is admin-provisioning — Account #0 registers another address.
  // We use registerUser() here so the deploy script controls the whole flow
  // without needing a second script invocation from a different signer.

  const alreadyRegistered = await medVault.isRegistered(relayerAddress);

  if (alreadyRegistered) {
    console.log('Relayer wallet already registered — skipping.');
  } else {
    // medVault is connected to the default signer (Account #0 / HospitalAdmin)
    // so onlyRole(Role.HospitalAdmin) passes correctly
    const registerTx = await medVault.registerUser(relayerAddress, 0); // 0 = Role.Patient
    await registerTx.wait();
    console.log('Relayer wallet registered as Patient successfully.');
  }

  // 3. Save contract address for the backend
  const config = { address: contractAddress };
  const targetDir = path.resolve(__dirname, '../controllers');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(targetDir, 'contractAddress.json'),
    JSON.stringify(config, null, 2)
  );
  console.log('Saved deployment address to controllers/contractAddress.json');

  // 4. Summary
  console.log('\n── Deployment summary ─────────────────────────────');
  console.log('Contract address :', contractAddress);
  console.log('Admin address    :', adminWallet.address);
  console.log('Relayer address  :', relayerAddress);
  console.log('Network          :', hre.network.name);
  console.log('───────────────────────────────────────────────────');
  console.log('\nUpdate your .env with:');
  console.log(`SMART_CONTRACT_ADDRESS=${contractAddress}`);
  console.log('RELAYER_PRIVATE_KEY=<private key of Account #1 from Hardhat>');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Deployment failed:', error);
    process.exit(1);
  });