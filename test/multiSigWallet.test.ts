/* eslint-disable no-unused-vars */
import { ethers } from "hardhat";
// eslint-disable no-unused-vars
import chai, { expect, use } from "chai";
import {
  deployContract,
  loadFixture,
  MockProvider,
  solidity,
} from "ethereum-waffle";
import MultiSigWalletJSON from "../artifacts/contracts/MultiSigWallet.sol/MultiSigWallet.json";
import { Wallet } from "ethers";

chai.use(solidity);

describe("Testing Multi Sig Wallets", function () {
  // Create fixture to prevent multiple deployments
  async function fixture(
    [msWallet, alice, bob, charlie, dana, erika, fawn]: Wallet[],
    provider: MockProvider
  ) {
    const multiSigWallet = await deployContract(msWallet, MultiSigWalletJSON, [
      [
        alice.address,
        bob.address,
        charlie.address,
        dana.address,
        erika.address,
        fawn.address,
      ],
      4,
    ]);
    return { multiSigWallet, msWallet, alice, bob, charlie, dana, erika, fawn };
  }

  it("Testing if constructor worked properly", async function () {
    const { multiSigWallet, msWallet, alice, bob, charlie, dana, erika, fawn } =
      await loadFixture(fixture);

    expect(await multiSigWallet.numConfirmationsRequired()).to.equal(4);
    expect(await multiSigWallet.owners(1)).to.equal(bob.address);

    await expect(
      deployContract(msWallet, MultiSigWalletJSON, [
        [
          alice.address,
          bob.address,
          charlie.address,
          dana.address,
          erika.address,
          fawn.address,
        ],
        8,
      ])
    ).to.be.revertedWith("num confirmations reqd invalid");

    await expect(
      deployContract(msWallet, MultiSigWalletJSON, [
        [alice.address, bob.address, charlie.address, charlie.address],
        2,
      ])
    ).to.be.revertedWith("owner present");
  });

  it("Testing submission of transaction", async function () {
    const { multiSigWallet, alice } = await loadFixture(fixture);
    const [_to] = await ethers.getSigners();
    const _mockData = "0x61626364";
    await expect(
      multiSigWallet.connect(alice).submitTransaction(_to.address, 1, _mockData)
    )
      .to.emit(multiSigWallet, "SubmitTransaction")
      .withArgs(alice.address, 0, _to.address, 1, _mockData);
  });

  it("Testing confirmation of transaction", async function () {
    const { multiSigWallet, alice, bob, charlie, dana } = await loadFixture(
      fixture
    );
    const [_to] = await ethers.getSigners();
    const _mockData = "0x61626364";
    await multiSigWallet
      .connect(alice)
      .submitTransaction(_to.address, 1, _mockData);

    // 2 owners give 2 confirmations
    await multiSigWallet.connect(bob).confirmTransaction(0);
    await multiSigWallet.connect(charlie).confirmTransaction(0);
    const { numConfirmations } = await multiSigWallet.transactions(0);
    expect(numConfirmations).to.equal(2);

    // Emits ConfirmTransaction
    expect(await multiSigWallet.connect(dana).confirmTransaction(0))
      .to.emit(multiSigWallet, "ConfirmTransaction")
      .withArgs(dana.address, 0);
  });

  it("Testing getTransactionCount, getOwners", async function () {
    const { multiSigWallet, alice, bob, charlie, dana, erika, fawn } =
      await loadFixture(fixture);
    const [_to] = await ethers.getSigners();
    const _mockData = "0x61626364";
    await multiSigWallet
      .connect(alice)
      .submitTransaction(_to.address, 1, _mockData);

    // 2 owners give 2 confirmations
    await multiSigWallet.connect(bob).confirmTransaction(0);
    const options = { gasLimit: ethers.utils.parseEther("0.000000000001") };
    await multiSigWallet.connect(dana).confirmTransaction(0);
    const { numConfirmations } = await multiSigWallet.transactions(0);
    expect(await multiSigWallet.getTransactionCount()).to.equal("1");
    const owners = await multiSigWallet.getOwners();
    expect(owners).to.have.members([
      alice.address,
      bob.address,
      charlie.address,
      dana.address,
      erika.address,
      fawn.address,
    ]);
    // expect(
    //   await multiSigWallet.connect(dana).revokeConfirmation(1, options)
    // ).to.be.revertedWith("Tx doesnt exist");

    // Emit RevokeConfirmation and check number of confirmations
    // expect(
    //   await multiSigWallet.connect(dana).revokeConfirmation(0, options)
    // ).to.emit(multiSigWallet, "RevokeConfirmation");
    //   .withArgs(dana.address, 0);
    // const { numConfirmations } = await multiSigWallet.transactions(0);
    // expect(numConfirmations).to.equal(1);
  });
});
