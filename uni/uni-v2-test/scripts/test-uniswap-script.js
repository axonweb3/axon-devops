// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
require("@nomiclabs/hardhat-waffle");
const hre = require("hardhat");

async function main() {
  // We get the contract to deploy
  const accounts = await hre.ethers.getSigners();
  const account1 = accounts[0];
  const account2 = accounts[1];

  // get  facatory contract objcet
  const facatory = await hre.ethers.getContractFactory("UniswapV2Factory");
  // get  weth contract objcet
  const weth = await hre.ethers.getContractFactory("WETH9");
  // get  UniswapV2Router02 contract objcet
  const router02 = await hre.ethers.getContractFactory("UniswapV2Router02");
  // get one Token ERC20  that name is TT
  const erc201 = await hre.ethers.getContractFactory("TRAMS");
  // get one Token ERC20  tha name is  TS
  const erc202 = await hre.ethers.getContractFactory("TRAMS");
  // get one Token ERC20  tha name is  TSY
  const erc203 = await hre.ethers.getContractFactory("TRAMS");

  // publish the factory contract
  const facatoryDe = await facatory.deploy(account1.address);
  facatoryDe.deployed();
  console.log("facatory address is ", facatoryDe.address);

  // publish the weth contract
  const wethDe = await weth.deploy();
  wethDe.deployed();
  console.log("weth address is ", wethDe.address);

  // publish contract UniswapV2Router02
  const router02De = await router02.deploy(
    facatoryDe.address,
    wethDe.address,
  );
  router02De.deployed();
  console.log("UniswapV2Router02 address is ", router02De.address);

  // deploy TT,TS,TSY Tokens
  const erc201De = await erc201.deploy("TT", "TT1", account1.address);
  const erc202De = await erc202.deploy("TS", "TS1", account1.address);
  const erc203De = await erc203.deploy("TSY", "TSY", account2.address);

  erc201De.deployed();
  erc202De.deployed();
  erc203De.deployed();

  // checked the  status of ERC20 is deployed
  console.log("erc201De address is ", erc201De.address);
  console.log("erc201De name is ", await erc201De.name());

  // create uniswap a token pari
  const pairCreateTx = await facatoryDe.createPair(
    erc201De.address,
    erc202De.address,
  );
  await pairCreateTx.wait();
  const pairAddress = await facatoryDe.getPair(
    erc201De.address,
    erc202De.address,
  );
  console.log("pairAddress is:", pairAddress);

  // approve TT,TS,TSY token into the UniswapV2Router02 address
  console.log(
    "account1 for TT  allowance is:",
    await erc201De.allowance(account1.address, account2.address),
  );
  const p1 = await erc201De.approve(router02De.address, 100000000000);
  const p2 = await erc202De.approve(router02De.address, 100000000000);
  const p3 = await erc203De.approve(router02De.address, 100000000000);
  await p1.wait();
  await p2.wait();
  await p3.wait();
  console.log(
    "account1 for TT  allowance is:",
    await erc201De.allowance(account1.address, account2.address),
  );

  // test addLiquidity
  await router02De.addLiquidity(
    erc201De.address,
    erc202De.address,
    10000000000,
    10000000000,
    10000000,
    10000000,
    account1.address,
    1642216356000,
  );

  /*
  if you test  UniswapV2Router02.addLiquidityETH,
  the  the  msg.sender have weth value that is not null,you
  must inject some money into weth token.
  */
  const pledgeEth = await wethDe.deposit({ value: 49000000 });
  await pledgeEth.wait();

  /*
  "0xc6ff18494dd8fe6b7df18b9921bac2a5af650377"
  is uniswap created auto  ,
  pari of tokan a is eth,token b is anther token.
  Note: the address  you can find the console log.
  */
  const pledgeEthTransfer = await wethDe.transfer(
    "0xc6ff18494dd8fe6b7df18b9921bac2a5af650377",
    40000,
  );
  await pledgeEthTransfer.wait();

  // test addLiquidityETH
  const addliqEth = await router02De.addLiquidityETH(
    erc201De.address,
    10000000000,
    10000000000,
    10000000,
    account1.address,
    1642216356000,
  );
  const receiptLiq = await addliqEth.wait();
  console.log("receipt is ", receiptLiq);
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
