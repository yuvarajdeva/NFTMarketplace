import { ethers } from 'ethers';
import tokenDetails, { transferProxy } from './token';

var provider;
var chainId;
var accounts;
var signer;


async function Disconnect() {
  userAddress = '';
  provider = "";
  signer = "";
  document.getElementById('Account').innerHTML = userAddress;
  alert("Disconnected")
}


async function connection() {
    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    accounts = await signer.getAddress();
    console.log("Account:", await signer.getAddress());
    let bal = await balance();
    chainId = await signer.getChainId();
    var Networkname = await provider.getNetwork();
    document.getElementById('Account').innerHTML = accounts;
    document.getElementById('Balance').innerHTML = bal;
    document.getElementById('chainId').innerHTML = chainId
    document.getElementById('network').innerHTML = Networkname.name;
    console.log(`User's address is ${accounts}`)
}

async function getaccounts() {
  try {
    signer = provider.getSigner();
    accounts = await signer.getAddress();
    return accounts;
  } catch (e) {
    console.log(e)
  }
}

async function balance() {
  var bal = await signer.getBalance()
  console.log((bal)/10**18)
  var walletBalance = (bal)/10**18
  document.getElementById('Balance').innerHTML = walletBalance; 
  return walletBalance;
}

async function splitSign(hash) {
  var signature = ethers.utils.splitSignature(hash);
  return signature;
}

async function signMessage(tradeContract, contract721, accounts, tokenURI, nonce, lazy) {
  var hash;
  if(lazy) {
    hash = ethers.utils.solidityKeccak256(["address", "address", "address", "string", "uint256"],[tradeContract, contract721, accounts, tokenURI, nonce])
  } else {
    hash = ethers.utils.solidityKeccak256(["address", "address", "string", "uint256"],[contract721, accounts, tokenURI, nonce])
  }
  var msgHash = ethers.utils.arrayify(hash)
  return msgHash
}

async function getContract(contractAddress, abi) {
  var contract = new ethers.Contract(contractAddress, abi, provider);
  var tokenContract = contract.connect(signer); 
  return tokenContract;
}

async function mint721() {
  let tokenURI = document.getElementById("uri").value;
  let fees = document.getElementById("rFee").value;
  var nonce = Math.floor(new Date().getTime() / 1000);
  let msgHash = await signMessage(tokenDetails.tradeContract, tokenDetails.contract721Address, accounts, tokenURI, nonce, false);
  let wallet = new ethers.Wallet(tokenDetails.privateKey, provider)
  var hash = await wallet.signMessage(msgHash);
  var sign = await splitSign(hash)
  var contract721 = await getContract(tokenDetails.contract721Address, tokenDetails.abi721);
  var tx = await contract721.mint(tokenURI, fees, [sign.v, sign.r, sign.s, nonce]);
  var receipt = await tx.wait();
  tokenID =  parseInt(receipt.events[0].topics[3])
  alert("tokenId" + ':'+ tokenID)
}

async function mint1155() {
  let tokenURI = document.getElementById("uri").value;
  let fees = document.getElementById("rFee").value;
  let supply = document.getElementById("supply").value;
  let nonce = Math.floor(new Date().getTime() / 1000);
  let msgHash = await signMessage(tokenDetails.tradeContract, tokenDetails.contract1155Address, accounts, tokenURI, nonce, false);
  let wallet = new ethers.Wallet(tokenDetails.privateKey, provider)
  var hash = await wallet.signMessage(msgHash);
  var sign = await splitSign(hash)
  var contract1155 = await getContract(tokenDetails.contract1155Address, tokenDetails.abi1155);
  var tx = await contract1155.mint(tokenURI, fees, supply, [sign.v, sign.r, sign.s, nonce]);
  var receipt = await tx.wait();
  var tokenID = parseInt((receipt.events[0].data).slice(0,66))
  alert("tokenId" + ':'+ tokenID)
}

async function approveNFT() {
  let type = document.getElementById("nftType").value;
  var contract;
  if(type == 0) {
    contract = await getContract(tokenDetails.contract1155Address, tokenDetails.abi1155);;
  } else {
    contract = await getContract(tokenDetails.contract721Address, tokenDetails.abi721);;
  }
  var tokenContract = contract.connect(signer); 
  var tx = await tokenContract.setApprovalForAll(tokenDetails.transferProxy, true);
  var receipt = await tx.wait()

}

async function signSellOrder() {
  let type = document.getElementById("assetType").value;
  let tokenId = document.getElementById("tokenId").value;
  let unitPrice  = document.getElementById("nftPrice").value;
  unitPrice = (unitPrice * 10 ** 18).toString();
  var nftAddress;

  if(type == 0) {
    nftAddress = tokenDetails.contract1155Address
  } else if(type == 1) {
    nftAddress = tokenDetails.contract721Address
  } else if(type == 2) {
    nftAddress = tokenDetails.lazyMinterc1155
  } else {
    nftAddress = tokenDetails.lazyMinterc721
  }

  let nonce = Math.floor(new Date().getTime() / 1000);
  console.log([nftAddress, tokenId, tokenDetails.erc20PaymentAddress, unitPrice, nonce])
  var hash = ethers.utils.solidityKeccak256(["address", "uint256", "address", "uint256", "uint256"],[nftAddress, tokenId, tokenDetails.erc20PaymentAddress, unitPrice, nonce])
  var msgHash = ethers.utils.arrayify(hash)
  var signHash = await signer.signMessage(msgHash);
  var sign = await splitSign(signHash)
  console.log(sign.v ,sign.r ,sign.s ,nonce)
  alert("V"+ ':'+ sign.v + ','+ "\nR" + ':'+ sign.r + ','+ "\nS" + ':'+ sign.s + ','+ "\nNonce", + ':'+ nonce)

}


async function bidSign() {
  let type = document.getElementById("assetType").value;
  let tokenId = document.getElementById("tokenId").value;
  let unitPrice  = document.getElementById("nftPrice").value
  let qty  = document.getElementById("quantity").value
  unitPrice = unitPrice * 10 ** 18;
  var nftAddress;
  let amount = (unitPrice + (unitPrice * 2.5 / 100)).toString()
  let proxy;

  if(type == 0) {
    nftAddress = tokenDetails.contract1155Address
    proxy = tokenDetails.transferProxy
  } else if(type == 1) {
    nftAddress = tokenDetails.contract721Address
    proxy = tokenDetails.transferProxy

  } else if(type == 2) {
    nftAddress = tokenDetails.lazyMinterc1155
    proxy = tokenDetails.lazyMintTransferProxy

  } else {
    nftAddress = tokenDetails.lazyMinterc721
    proxy = tokenDetails.lazyMintTransferProxy

  }

  await deposit(amount)
  await approveERC20(proxy,amount)


  let nonce = Math.floor(new Date().getTime() / 1000);

  console.log(nftAddress, tokenId, tokenDetails.erc20PaymentAddress, amount, qty, nonce)
  var hash = ethers.utils.solidityKeccak256(["address", "uint256", "address", "uint256", "uint256", "uint256"],[nftAddress, tokenId, tokenDetails.erc20PaymentAddress, amount, qty, nonce])
  var msgHash = ethers.utils.arrayify(hash)
  var signHash = await signer.signMessage(msgHash);
  var sign = await splitSign(signHash)
  console.log(sign.v ,sign.r ,sign.s ,nonce)

}


async function deposit(amount) {
  var contract = await getContract(tokenDetails.erc20PaymentAddress, tokenDetails.weth);
  var tx = await contract.deposit({value: amount})
  await tx.wait()
}

async function approveERC20(contractAddress, amount) {
  var contract = await getContract(tokenDetails.erc20PaymentAddress, tokenDetails.weth);
  var tx = await contract.approve(contractAddress, amount)
  await tx.wait()

}

async function buyAsset() {

  var sign;
  let type = document.getElementById("buynftType").value;
  let tokenID = document.getElementById("buytokenId").value;
  let unitPrice  = document.getElementById("buynftPrice").value;
  sign = JSON.parse(document.getElementById("buysignValue").value);
  console.log(sign)
  let assetOwner = document.getElementById("buysellerAddress").value;
  let qty = document.getElementById("buyquantity").value;

  unitPrice = (unitPrice * 10 ** 18).toString();
  let amount = (Number(unitPrice) + Number(unitPrice * 2.5 / 100)).toString();
  let nftAddress;
  let abi;

  await deposit(amount)
  await approveERC20(tokenDetails.transferProxy ,amount)

  if(type == 0) 
  {
    nftAddress = tokenDetails.contract1155Address
    abi = tokenDetails.abi1155
  } else {
    nftAddress = tokenDetails.contract721Address
    abi = tokenDetails.abi721
  }

  var orderStruct = [
    assetOwner, 
    accounts,
    tokenDetails.erc20PaymentAddress,
    nftAddress,
    type,
    unitPrice,
    amount,
    tokenID,
    qty
  ]

  var tokenContract = await getContract(tokenDetails.trade ,tokenDetails.abiTrade);
  var contract = tokenContract.connect(signer); 
  var tx = await contract.buyAsset(orderStruct, sign);
  var receipt = await tx.wait();
  console.log(receipt)

}

async function executeBid() {

  let type = document.getElementById("bidnftType").value;
  let tokenID = document.getElementById("bidtokenId").value;
  let unitPrice  = document.getElementById("bidnftPrice").value;
  let sign = JSON.parse(document.getElementById("bidsignValue").value);
  let buyerAddress = document.getElementById("bidbuyerAddress").value;
  let qty = document.getElementById("bidquantity").value;

  unitPrice = (unitPrice * 10 ** 18).toString();
  let amount = (Number(unitPrice) + Number(unitPrice * 2.5 / 100)).toString();
  let nftAddress;
  let abi;

  if(type == 0) 
  {
    nftAddress = tokenDetails.contract1155Address
    abi = tokenDetails.abi1155
  } else {
    nftAddress = tokenDetails.contract721Address
    abi = tokenDetails.abi721
  }
  var orderStruct = [
    accounts, 
    buyerAddress,
    tokenDetails.erc20PaymentAddress,
    nftAddress,
    type,
    unitPrice,
    amount,
    tokenID,
    qty
  ]


var tokenContract = await getContract(tokenDetails.trade ,tokenDetails.abiTrade);
var contract = tokenContract.connect(signer); 
var tx = await contract.executeBid(orderStruct, sign);
var receipt = await tx.wait();
console.log(receipt)

}

async function mintAndBuyAsset() {

  let type = document.getElementById("mbuynftType").value;
  let tokenID = document.getElementById("mbuytokenId").value;
  let royaltyFee = document.getElementById("mbuyrFee").value;
  let unitPrice  = document.getElementById("mbuynftPrice").value;
  let sign = JSON.parse(document.getElementById("mbuysignValue").value);
  let assetOwner = document.getElementById("mbuysellerAddress").value;
  let qty = document.getElementById("mbuyquantity").value;
  let supply = document.getElementById("mbuysupply").value;
  let tokenURI = document.getElementById("mbuyuri").value

  let nonce = Math.floor(new Date().getTime() / 1000);
  unitPrice = (unitPrice * 10 ** 18).toString();
  let amount = (Number(unitPrice) + Number(unitPrice * 2.5 / 100)).toString();
  var isImport = false;
  let nftAddress;
  let abi;

  await deposit(amount)
  await approveERC20(tokenDetails.lazyMintTransferProxy, amount)

  if(type == 2) 
  {
    nftAddress = tokenDetails.lazyMinterc1155
    abi = tokenDetails.abi1155LazyMint
  } else {
    nftAddress = tokenDetails.lazyMinterc721
    abi = tokenDetails.abi721LazyMint
  }


  let msgHash = await signMessage(tokenDetails.lazyMintTrade, nftAddress, assetOwner, tokenURI, nonce, true);
  let wallet = new ethers.Wallet(tokenDetails.privateKey, provider)
  var hash = await wallet.signMessage(msgHash);
  var OwnerSign = await splitSign(hash)

  var orderStruct = [
    assetOwner, 
    accounts,
    tokenDetails.erc20PaymentAddress,
    nftAddress,
    type,
    unitPrice,
    isImport,
    amount,
    tokenID,
    tokenURI,
    supply,
    royaltyFee,
    qty
  ]
 
  var tokenContract = await getContract(tokenDetails.lazyMintTrade ,tokenDetails.abiTradeLazyMint);

  var tx = await tokenContract.mintAndBuyAsset(orderStruct, sign, [OwnerSign.v, OwnerSign.r, OwnerSign.s, nonce]);
  var receipt = await tx.wait();
  console.log(receipt)
}

async function minAndAcceptBid() {

  let type = document.getElementById("mbidnftType").value;
  let tokenID = document.getElementById("mbidtokenId").value;
  let unitPrice  = document.getElementById("mbidnftPrice").value;
  let royaltyFee = document.getElementById("mbidrFee").value;
  let sign = JSON.parse(document.getElementById("mbidsignValue").value);
  let buyerAddress = document.getElementById("mbidbuyerAddress").value;
  let qty = document.getElementById("mbidquantity").value;
  let supply = document.getElementById("mbidsupply").value;
  let tokenURI = document.getElementById("mbiduri").value

  let nonce = Math.floor(new Date().getTime() / 1000);
  let msgHash = await signMessage(tokenDetails.lazyMintTrade, tokenDetails.lazyMinterc1155, accounts, tokenURI, nonce, true);
  let wallet = new ethers.Wallet(tokenDetails.privateKey, provider)
  var hash = await wallet.signMessage(msgHash);
  var OwnerSign = await splitSign(hash)
 
  unitPrice = (unitPrice * 10 ** 18).toString();
  let amount = (Number(unitPrice) + Number(unitPrice * 2.5 / 100)).toString();
  var isImport = false;
  let nftAddress;
  var abi;

  if(type == 2) 
  {
    nftAddress = tokenDetails.lazyMinterc1155
    abi = tokenDetails.abi1155
  } else {
    nftAddress = tokenDetails.lazyMinterc721
    abi = tokenDetails.abi721
  }

  var orderStruct = [
    accounts, 
    buyerAddress,
    tokenDetails.erc20PaymentAddress,
    nftAddress,
    type,
    unitPrice,
    isImport,
    amount,
    tokenID,
    tokenURI,
    supply,
    royaltyFee,
    qty
  ]
 
  var tokenContract = await getContract(tokenDetails.lazyMintTrade ,tokenDetails.abiTradeLazyMint);
  var tx = await tokenContract.mintAndExecuteBid(orderStruct, sign, [OwnerSign.v, OwnerSign.r, OwnerSign.s, nonce]);
  var receipt = await tx.wait();
  console.log(receipt)
}


function getRandom(address) {
  let value = Date.now() + Math.floor((Math.random() * (10 ** 10)) + 1);
  var hex = value.toString(16);
  hex = hex + address.slice(2);
  return `0x${'0'.repeat(64-hex.length)}${hex}`;
}

async function deploy() {
  let type = document.getElementById("ownNftType").value;
  let name = document.getElementById("ownNftName").value;
  let symbol = document.getElementById("ownNftSymbol").value;
  let tokenURI = tokenDetails.uri
  let factoryContract;
  var abi; 

  var salt = getRandom(accounts);


  if(type == 0) {
    factoryContract = tokenDetails.factory1155;
    abi = tokenDetails.factory1155abi;
  } else {
    factoryContract = tokenDetails.factory721;
    abi = tokenDetails.factory721abi;
  }

  var tokenContract = await getContract(factoryContract, abi);
  var tx = await tokenContract.deploy(salt, name, symbol, tokenURI);
  var receipt = await tx.wait();
  console.log("contractAddress",receipt.events[4].args["contractAddress"])

}

async function connectWallet() {
    document.getElementById('connectButton').onclick = connection
    document.getElementById('disConnectButton').onclick = Disconnect
    document.getElementById('Account').onclick = getaccounts
    document.getElementById('Balance').onclick = balance
    document.getElementById('mint721').onclick = mint721
    document.getElementById('mint1155').onclick = mint1155
    document.getElementById('approveNft').onclick = approveNFT
    document.getElementById('signseller').onclick = signSellOrder
    document.getElementById('signbid').onclick = bidSign
    document.getElementById('buy').onclick = buyAsset
    document.getElementById('bid').onclick = executeBid
    document.getElementById('mBuy').onclick = mintAndBuyAsset
    document.getElementById('mBid').onclick = minAndAcceptBid
    document.getElementById('deploy').onclick = deploy
}

connectWallet();