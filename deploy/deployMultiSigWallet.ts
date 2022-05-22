/* eslint-disable node/no-unpublished-import */
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/dist/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  /* For some reason, typescript cant find deployments, getNamedAccounts in hre.
    But deployment working fine. */
  // @ts-ignore:next-line
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer, alice, bob, charlie, dana, erika, fawn } =
    await getNamedAccounts();

  await deploy("MultiSigWallet", {
    // <-- name of the deployment
    contract: "MultiSigWallet", // <-- name of the contract/artifact(more specifically) to deploy
    from: deployer, // <-- account to deploy from
    args: [[alice, bob, charlie, dana, erika, fawn], 4], // <-- contract constructor arguments. Here it has nothing
    log: true, // <-- log the address and gas used in the console
  });
};

export default func;
func.tags = ["MultiSigWallet"];
