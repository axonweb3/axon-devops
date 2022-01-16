// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
require("@nomiclabs/hardhat-waffle");
const hre = require("hardhat");
;
async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const { expect } = require("chai")
  const accounts = await hre.ethers.getSigners();
  const account_a = accounts[0];
  const account_b = accounts[1];

  //get  facatory constract objcet 
  const Facatory = await hre.ethers.getContractFactory("UniswapV2Factory");
  //get  weth constract objcet 
  const WETH = await hre.ethers.getContractFactory("WETH9");
  //get  UniswapV2Router02 constract objcet
  const Router02 = await hre.ethers.getContractFactory("UniswapV2Router02");
  //get one Token ERC20  that name is TT
  const ERC20_1 = await hre.ethers.getContractFactory("TRAMS");
  //get one Token ERC20  tha name is  TS
  const ERC20_2 = await hre.ethers.getContractFactory("TRAMS");
  //get one Token ERC20  tha name is  TSY
  const ERC20_3 = await hre.ethers.getContractFactory("TRAMS");

  //publish the factory constract 
  const Facatory_de = await Facatory.deploy(account_a.address);
  Facatory_de.deployed();
  console.log("facatory address is ", Facatory_de.address)

  //publish the weth constract 
  const Weth_de = await WETH.deploy();
  Weth_de.deployed();
  console.log("weth address is ", Weth_de.address)


  //publish constract UniswapV2Router02
  const Router02_de = await Router02.deploy(Facatory_de.address, Weth_de.address);
  Router02_de.deployed();
  console.log("UniswapV2Router02 address is ", Router02_de.address)

  //deploy TT,TS,TSY Tokens
  const ERC20_1_de = await ERC20_1.deploy("TT", "TT1", account_a.address);
  const ERC20_2_de = await ERC20_2.deploy("TS", "TS1", account_a.address);
  const ERC20_3_de = await ERC20_3.deploy("TSY", "TSY", account_b.address);

  ERC20_1_de.deployed();
  ERC20_2_de.deployed();
  ERC20_3_de.deployed();


  //checked the  status of ERC20 is deployed 
  console.log("ERC20_1_de address is ", ERC20_1_de.address);
  console.log("ERC20_1_de name is ", await ERC20_1_de.name());

  //create uniswap a token pari
  const pair_create_tx = await Facatory_de.createPair(ERC20_1_de.address, ERC20_2_de.address);
  await pair_create_tx.wait();
  const pair_address = await Facatory_de.getPair(ERC20_1_de.address, ERC20_2_de.address);
  console.log("pair_address is:", pair_address);


  //approve TT,TS,TSY token into the UniswapV2Router02 address
  console.log("account_a for TT  allowance is:", await ERC20_1_de.allowance(account_a.address, account_b.address));
  const p1 = await ERC20_1_de.approve(Router02_de.address, 100000000000);
  const p2 = await ERC20_2_de.approve(Router02_de.address, 100000000000);
  const p3 = await ERC20_3_de.approve(Router02_de.address, 100000000000);
  await p1.wait();
  await p2.wait();
  await p3.wait();
  console.log("account_a for TT  allowance is:", await ERC20_1_de.allowance(account_a.address, account_b.address));

  //test addLiquidity
  const addliq = await Router02_de.addLiquidity(ERC20_1_de.address, ERC20_2_de.address, 10000000000, 10000000000, 10000000, 10000000, account_a.address, 1642216356000);


  //if you test  UniswapV2Router02.addLiquidityETH,the  the  msg.sender have weth value that is not null,you must inject some money into weth token.
  const pledgeEth = await Weth_de.deposit({ value: 49000000 });
  await pledgeEth.wait();

  //"0xc6ff18494dd8fe6b7df18b9921bac2a5af650377" is uniswap created auto  ,  pari of tokan a is eth,token b is anther token. Note: the address  you can find the console log.
  const pledge_eth_transfer = await Weth_de.transfer("0xc6ff18494dd8fe6b7df18b9921bac2a5af650377", 40000);
  await pledge_eth_transfer.wait();

  //test addLiquidityETH
  const addliqEth = await Router02_de.addLiquidityETH(ERC20_1_de.address, 10000000000, 10000000000, 10000000, account_a.address, 1642216356000);
  const receipt_liq = await addliqEth.wait();
  console.log("receipt is ", receipt_liq);

}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
