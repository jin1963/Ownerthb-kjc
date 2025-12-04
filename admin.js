// admin.js - Owner Admin Panel for THBC → KJC Stake

let provider, signer, currentAccount;
let thbcContract, stakeContract;

function $(id) {
  return document.getElementById(id);
}

async function connect() {
  try {
    const injected = window.ethereum || window.BinanceChain || window.bitget?.ethereum;
    if (!injected) {
      alert("Wallet not found");
      return;
    }

    provider = new ethers.providers.Web3Provider(injected);
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    currentAccount = await signer.getAddress();

    const cfg = window.CONFIG;
    stakeContract = new ethers.Contract(cfg.stake.address, cfg.stake.abi, signer);
    thbcContract = new ethers.Contract(cfg.thbc.address, cfg.thbc.abi, signer);

    const owner = await stakeContract.owner();
    if (owner.toLowerCase() !== currentAccount.toLowerCase()) {
      alert("You are NOT Owner!");
      return;
    }

    $("btnConnect").textContent = "Connected as Owner ✓";
    refreshData();

  } catch (err) {
    console.error(err);
    alert("Connect failed: " + err.message);
  }
}

async function refreshData() {
  try {
    const cfg = window.CONFIG;

    const thbcIn = await thbcContract.balanceOf(cfg.stake.address);
    $("thbcIn").textContent = ethers.utils.formatUnits(thbcIn, 18);

    const kjcLocked = await stakeContract.totalKjcLocked();
    $("kjcLocked").textContent = ethers.utils.formatUnits(kjcLocked, 18);

  } catch (err) {
    console.error(err);
  }
}

async function updateRate() {
  try {
    const v = $("rateInput").value;
    if (!v) return alert("Enter new rate");

    const bn = ethers.utils.parseUnits(v, 18);
    const tx = await stakeContract.setRateKjcPerThbc(bn);
    await tx.wait();
    alert("Rate updated!");
    refreshData();
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
}

async function updateAPY() {
  try {
    const v = $("apyInput").value;
    if (!v) return alert("Enter APY %");
    const bps = Math.floor(Number(v) * 100);

    const tx = await stakeContract.setAPY(bps);
    await tx.wait();
    alert("APY updated!");
    refreshData();
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
}

async function updateLock() {
  try {
    const v = $("lockInput").value;
    if (!v) return alert("Enter days");
    const seconds = Number(v) * 86400;

    const tx = await stakeContract.setLockDuration(seconds);
    await tx.wait();
    alert("Lock duration updated!");
    refreshData();
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
}

window.connect = connect;
window.updateRate = updateRate;
window.updateAPY = updateAPY;
window.updateLock = updateLock;
