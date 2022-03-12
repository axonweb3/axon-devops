require("@nomiclabs/hardhat-waffle");
const hre = require("hardhat");

async function main() {
  const account1 = await hre.ethers.getSigner(
    "0x35E70C3F5A794A77Efc2Ec5bA964BFfcC7Fd2C0a",
  );

  console.log("signer address is :", account1.address);
  const Facatory = await hre.ethers.getContractFactory("UniswapV2Factory");
  const WETH = await hre.ethers.getContractFactory("WETH9");
  const Router02 = await hre.ethers.getContractFactory("UniswapV2Router02");

  // publish the factory contract
  const facatoryDe = await Facatory.deploy(account1.address);
  facatoryDe.deployed();
  console.log("facatory address is ", facatoryDe.address);

  // publish the weth contract
  const wethDe = await WETH.deploy();
  wethDe.deployed();
  console.log("weth address is ", account1.address);

  // publish UniswapV2Router02 contract
  const router02De = await Router02.deploy(facatoryDe.address, wethDe.address);
  router02De.deployed();
  console.log("UniswapV2Router02 address is ", router02De.address);
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
