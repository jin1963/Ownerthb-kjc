// admin.js – Owner panel THBC → KJC

let provider, signer, stakeWrite, stakeRead, thbcRead;
let currentAccount = null;

function $(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}

function setMsg(text) {
  setText("txMessage", text);
}

// ---------------- Connect Wallet ----------------
async function connectWallet() {
  try {
    const injected =
      window.ethereum ||
      window.BinanceChain ||
      (window.bitget && window.bitget.ethereum);

    if (!injected) {
      alert("ไม่พบ Web3 Wallet (MetaMask / Binance / Bitget)");
      return;
    }

    provider = new ethers.providers.Web3Provider(injected, "any");
    const acc = await provider.send("eth_requestAccounts", []);
    currentAccount = acc[0];
    signer = provider.getSigner();

    const net = await provider.getNetwork();
    if (net.chainId !== THBC_KJC_CONFIG.chainId) {
      alert("กรุณาเปลี่ยนเป็น BNB Smart Chain");
      return;
    }

    stakeWrite = new ethers.Contract(
      THBC_KJC_CONFIG.stake.address,
      THBC_KJC_CONFIG.stake.abi,
      signer
    );
    stakeRead = new ethers.Contract(
      THBC_KJC_CONFIG.stake.address,
      THBC_KJC_CONFIG.stake.abi,
      provider
    );

    const owner = await stakeRead.owner();
    if (owner.toLowerCase() !== currentAccount.toLowerCase()) {
      setText("ownerStatus", "Not Owner ❌");
      setMsg("คุณไม่ใช่ Owner ของสัญญานี้");
      return;
    }

    setText("ownerStatus", "Connected as Owner ✓");
    setMsg("");

    await refreshData();

    if (injected.on) {
      injected.on("accountsChanged", () => window.location.reload());
      injected.on("chainChanged", () => window.location.reload());
    }
  } catch (err) {
    console.error(err);
    setMsg("Connect failed: " + err.message);
  }
}

// ---------------- Refresh Data ----------------
async function refreshData() {
  try {
    const thbcAddr = await stakeRead.thbc();
    if (!thbcRead) {
      thbcRead = new ethers.Contract(
        thbcAddr,
        ["function balanceOf(address) view returns (uint256)"],
        provider
      );
    }

    const thbcBal = await thbcRead.balanceOf(THBC_KJC_CONFIG.stake.address);
    const kjcLocked = await stakeRead.totalKjcLocked();

    setText("thbcIn", ethers.utils.formatUnits(thbcBal, 18));
    setText("kjcLocked", ethers.utils.formatUnits(kjcLocked, 18));
  } catch (err) {
    console.error("refreshData error:", err);
  }
}

// ---------------- Update Rate ----------------
$("btnRate").onclick = async () => {
  try {
    if (!stakeWrite) await connectWallet();
    const val = $("rate").value.trim();
    const bn = ethers.utils.parseUnits(val, 18);
    const tx = await stakeWrite.setRateKjcPerThbc(bn);
    setMsg("Updating rate...");
    await tx.wait();
    setMsg("Rate updated ✓");
    refreshData();
  } catch (err) {
    setMsg("Update failed: " + err.message);
  }
};

// ---------------- Update APY ----------------
$("btnApy").onclick = async () => {
  try {
    if (!stakeWrite) await connectWallet();
    const num = parseFloat($("apy").value.trim());
    const bps = Math.round(num * 100);
    const tx = await stakeWrite.setAPY(bps);
    setMsg("Updating APY...");
    await tx.wait();
    setMsg("APY updated ✓");
    refreshData();
  } catch (err) {
    setMsg("Update failed: " + err.message);
  }
};

// ---------------- Update Lock Duration ----------------
$("btnLock").onclick = async () => {
  try {
    if (!stakeWrite) await connectWallet();
    const sec = parseInt($("days").value.trim()) * 86400;
    const tx = await stakeWrite.setLockDuration(sec);
    setMsg("Updating lock duration...");
    await tx.wait();
    setMsg("Lock duration updated ✓");
    refreshData();
  } catch (err) {
    setMsg("Update failed: " + err.message);
  }
};

// ---------------- Withdraw ALL THBC ----------------
$("btnWithdrawThbc").onclick = async () => {
  try {
    if (!stakeWrite) await connectWallet();
    const owner = await stakeRead.owner();
    const thbcAddr = await stakeRead.thbc();
    const thbcBal = await thbcRead.balanceOf(THBC_KJC_CONFIG.stake.address);
    if (thbcBal.isZero()) {
      setMsg("No THBC to withdraw");
      return;
    }
    const tx = await stakeWrite.withdrawToken(thbcAddr, owner, thbcBal);
    setMsg("Withdrawing...");
    await tx.wait();
    setMsg("Withdraw success ✓");
    refreshData();
  } catch (err) {
    setMsg("Withdraw failed: " + err.message);
  }
};
