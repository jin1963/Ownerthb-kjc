// admin.js – Owner panel THBC → KJC

let provider, signer, stakeWrite, stakeRead, thbcRead;
let currentAccount = null;

function $(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const el = $(id);
  if (!el) return;
  el.textContent = value;
}

function setMsg(text) {
  setText("txMessage", text || "");
}

// ---------------- CONNECT WALLET ----------------

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
    if (!acc || acc.length === 0) {
      alert("ไม่พบบัญชีในกระเป๋า");
      return;
    }
    currentAccount = acc[0];
    signer = provider.getSigner();

    const net = await provider.getNetwork();
    if (net.chainId !== THBC_KJC_CONFIG.chainId) {
      alert("เครือข่ายไม่ตรง กรุณาเปลี่ยนเป็น BNB Smart Chain แล้วลองใหม่");
      return;
    }

    // เข้าถึงสัญญา stake
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

    // ตรวจ owner
    const owner = await stakeRead.owner();
    if (owner.toLowerCase() !== currentAccount.toLowerCase()) {
      setText("ownerStatus", "Not Owner ❌");
      setMsg("คุณไม่ใช่ owner ของสัญญานี้");
      return;
    }

    setText("ownerStatus", "Connected as Owner ✓");
    setMsg("");

    if (injected && injected.on) {
      injected.on("accountsChanged", () => window.location.reload());
      injected.on("chainChanged", () => window.location.reload());
    }

    await refreshData();
  } catch (err) {
    console.error(err);
    setMsg("Connect failed: " + (err.message || err));
  }
}

// ---------------- REFRESH DATA ----------------

async function refreshData() {
  try {
    if (!stakeRead) return;

    // --- THBC in contract ---
    const thbcAddr = await stakeRead.thbc();
    if (!thbcRead) {
      const erc20Abi = [
        "function balanceOf(address) view returns (uint256)"
      ];
      thbcRead = new ethers.Contract(thbcAddr, erc20Abi, provider);
    }
    const thbcBal = await thbcRead.balanceOf(THBC_KJC_CONFIG.stake.address);
    setText("thbcIn", ethers.utils.formatUnits(thbcBal, 18));

    // --- KJC locked total ---
    let kjcText = "-";

    // ถ้ามีฟังก์ชันรวมในสัญญา ใช้เลย
    if (typeof stakeRead.totalKjcLocked === "function") {
      const kjc = await stakeRead.totalKjcLocked();
      kjcText = ethers.utils.formatUnits(kjc, 18);
    } else if (typeof stakeRead.totalStakedKjc === "function") {
      const kjc = await stakeRead.totalStakedKjc();
      kjcText = ethers.utils.formatUnits(kjc, 18);
    } else {
      // ถ้าไม่มี view รวม อาจต้องเพิ่มในสัญญา (ตอนนี้โชว์ "-" ไว้ก่อน)
      kjcText = "-";
    }

    setText("kjcLocked", kjcText);

    // reward รวมยังไม่มี view ในสัญญา
    setText("rewardOwed", "-");
  } catch (err) {
    console.error("refreshData error:", err);
    setMsg("Refresh failed ❌ " + (err.message || err));
  }
}

// ---------------- UPDATE RATE ----------------

async function updateRate() {
  try {
    if (!stakeWrite) await connectWallet();
    if (!stakeWrite) return;

    const val = $("rate").value.trim();
    if (!val) {
      alert("กรุณากรอก Rate เช่น 1.9");
      return;
    }

    const bn = ethers.utils.parseUnits(val, 18);
    setMsg("Updating rate...");
    const tx = await stakeWrite.setRateKjcPerThbc(bn);
    await tx.wait();
    setMsg("Rate updated ✅");
    await refreshData();
  } catch (err) {
    console.error(err);
    setMsg("Update rate failed: " + (err.message || err));
  }
}

// ---------------- UPDATE APY ----------------

async function updateApy() {
  try {
    if (!stakeWrite) await connectWallet();
    if (!stakeWrite) return;

    const val = $("apy").value.trim();
    if (!val) {
      alert("กรุณากรอก APY (%)");
      return;
    }

    const num = parseFloat(val);
    const bps = Math.round(num * 100); // 15% → 1500

    setMsg("Updating APY...");
    const tx = await stakeWrite.setAPY(bps);
    await tx.wait();
    setMsg("APY updated ✅");
    await refreshData();
  } catch (err) {
    console.error(err);
    setMsg("Update APY failed: " + (err.message || err));
  }
}

// -------------- UPDATE LOCK DURATION -----------

async function updateLock() {
  try {
    if (!stakeWrite) await connectWallet();
    if (!stakeWrite) return;

    const val = $("days").value.trim();
    if (!val) {
      alert("กรุณากรอกจำนวนวัน lock เช่น 365 หรือ 180");
      return;
    }

    const d = parseInt(val, 10);
    const sec = d * 24 * 60 * 60;

    setMsg("Updating lock duration...");
    const tx = await stakeWrite.setLockDuration(sec);
    await tx.wait();
    setMsg("Lock duration updated ✅");
    await refreshData();
  } catch (err) {
    console.error(err);
    setMsg("Update lock duration failed: " + (err.message || err));
  }
}

// ---------------- WITHDRAW THBC ALL ------------

async function withdrawThbcAll() {
  try {
    if (!stakeWrite) await connectWallet();
    if (!stakeWrite) return;

    // อ่าน THBC address + balance ปัจจุบันในสัญญา
    const thbcAddr = await stakeRead.thbc();

    if (!thbcRead) {
      const erc20Abi = [
        "function balanceOf(address) view returns (uint256)"
      ];
      thbcRead = new ethers.Contract(thbcAddr, erc20Abi, provider);
    }

    const bal = await thbcRead.balanceOf(THBC_KJC_CONFIG.stake.address);
    if (bal.isZero()) {
      setMsg("ไม่มี THBC ให้ถอน");
      return;
    }

    setMsg("Withdrawing THBC...");
    const tx = await stakeWrite.withdrawToken(thbcAddr, currentAccount, bal);
    await tx.wait();
    setMsg("Withdraw THBC success ✅");
    await refreshData();
  } catch (err) {
    console.error(err);
    setMsg("Withdraw THBC failed: " + (err.message || err));
  }
}

// ---------------- BIND BUTTONS -----------------

document.addEventListener("DOMContentLoaded", () => {
  if ($("btnConnect")) $("btnConnect").onclick = connectWallet;
  if ($("btnRate")) $("btnRate").onclick = updateRate;
  if ($("btnApy")) $("btnApy").onclick = updateApy;
  if ($("btnLock")) $("btnLock").onclick = updateLock;
  if ($("btnWithdrawThbc")) $("btnWithdrawThbc").onclick = withdrawThbcAll;
});
