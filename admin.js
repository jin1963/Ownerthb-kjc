// admin.js - Owner Panel for THBC → KJC Stake

let provider, signer, stakeWrite, stakeRead;
let currentAccount = null;

function $(id) { return document.getElementById(id); }

window.addEventListener("load", () => {
  if ($("btnConnect")) $("btnConnect").onclick = connectWallet;
  if ($("btnUpdateRate")) $("btnUpdateRate").onclick = updateRate;
  if ($("btnUpdateApy")) $("btnUpdateApy").onclick = updateApy;
  if ($("btnUpdateLock")) $("btnUpdateLock").onclick = updateLock;
});

async function connectWallet() {
  try {
    const injected = window.ethereum || window.BinanceChain || (window.bitget && window.bitget.ethereum);
    if (!injected) return alert("No Wallet found (MetaMask / Binance / Bitget)");

    provider = new ethers.providers.Web3Provider(injected, "any");
    const acc = await provider.send("eth_requestAccounts", []);
    currentAccount = acc[0];
    signer = provider.getSigner();

    const net = await provider.getNetwork();
    if (net.chainId !== THBC_KJC_CONFIG.chainId) {
      alert("Wrong network! Please use BNB Smart Chain");
      return;
    }

    stakeWrite = new ethers.Contract(THBC_KJC_CONFIG.stake.address, THBC_KJC_CONFIG.stake.abi, signer);
    stakeRead = new ethers.Contract(THBC_KJC_CONFIG.stake.address, THBC_KJC_CONFIG.stake.abi, provider);

    const owner = await stakeWrite.owner();
    if (owner.toLowerCase() !== currentAccount.toLowerCase()) {
      setMsg("Not Owner ❌", false);
      return;
    }

    setMsg("Connected as Owner ✓", true);
    await refreshData();
  } catch(e) {
    console.error(e);
    setMsg("Connect failed: " + e.message, false);
  }
}

async function refreshData() {
  try {
    const count = await stakeRead.getStakeCount(currentAccount);
    let totalKjc = ethers.BigNumber.from(0);
    let totalReward = ethers.BigNumber.from(0);
    let totalThbc = ethers.BigNumber.from(0);

    const rate = await stakeRead.rateKjcPerThbc();

    for (let i = 0; i < count; i++) {
      const s = await stakeRead.getStake(currentAccount, i);
      const principal = s.principal;
      const reward = s.reward;
      totalKjc = totalKjc.add(principal);
      totalReward = totalReward.add(reward);

      let thbc = principal.mul(ethers.constants.WeiPerEther).div(rate);
      totalThbc = totalThbc.add(thbc);
    }

    $("thbcBal").textContent = ethers.utils.formatUnits(totalThbc, 18);
    $("kjcLocked").textContent = ethers.utils.formatUnits(totalKjc, 18);
  } catch(e) {
    console.error("refreshData error:", e);
    setMsg("Read data error", false);
  }
}

// ---- Update Rate ----
async function updateRate() {
  try {
    const val = $("rateInput").value.trim();
    const bn = ethers.utils.parseUnits(val, 18);

    const tx = await stakeWrite.setRateKjcPerThbc(bn);
    await tx.wait();

    setMsg("Rate updated ✓", true);
    refreshData();
  } catch(e) {
    setMsg("Update rate failed: " + e.message, false);
  }
}

// ---- Update APY ----
async function updateApy() {
  try {
    const val = parseFloat($("apyInput").value.trim());
    const bps = Math.round(val * 100);

    const tx = await stakeWrite.setApyBps(bps);
    await tx.wait();

    setMsg("APY updated ✓", true);
    refreshData();
  } catch(e) {
    setMsg("Update APY failed: " + e.message, false);
  }
}

// ---- Update Lock Duration ----
async function updateLock() {
  try {
    const val = parseInt($("lockInput").value.trim());
    const sec = val * 24 * 60 * 60;

    const tx = await stakeWrite.setLockDuration(sec);
    await tx.wait();

    setMsg("Lock duration updated ✓", true);
    refreshData();
  } catch(e) {
    setMsg("Update Lock failed: " + e.message, false);
  }
}

function setMsg(msg, ok) {
  const el = $("txMessage");
  el.textContent = msg;
  el.classList.remove("msg-success", "msg-error");
  el.classList.add(ok ? "msg-success" : "msg-error");
}
