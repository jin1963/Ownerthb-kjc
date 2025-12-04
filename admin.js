// admin.js – Owner panel THBC → KJC

//================== CONFIG LOCAL VARS ==================
let provider, signer, stakeWrite, stakeRead, thbcRead;
let currentAccount = null;

//================== HELPER ==================
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

//================== CONNECT WALLET ==================
async function connectWallet() {
  try {
    setMsg("");

    const injected =
      window.ethereum ||
      window.BinanceChain ||
      (window.bitget && window.bitget.ethereum);

    if (!injected) {
      alert("ไม่พบ Web3 Wallet (MetaMask / Binance / Bitget)");
      return;
    }

    // ขอสิทธิ์เชื่อมต่อ
    provider = new ethers.providers.Web3Provider(injected, "any");
    const acc = await provider.send("eth_requestAccounts", []);
    if (!acc || acc.length === 0) {
      alert("ไม่พบบัญชีในกระเป๋า");
      return;
    }

    currentAccount = acc[0];
    signer = provider.getSigner();

    // เช็กเครือข่าย
    const net = await provider.getNetwork();
    if (net.chainId !== THBC_KJC_CONFIG.chainId) {
      alert("เครือข่ายไม่ตรง กรุณาเปลี่ยนเป็น BNB Smart Chain แล้วลองใหม่");
      setText("ownerStatus", "Wrong Network ❌");
      return;
    }

    // ผูกสัญญา
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

    // เช็ก owner
    const owner = await stakeRead.owner();
    if (owner.toLowerCase() !== currentAccount.toLowerCase()) {
      setText("ownerStatus", "Not Owner ❌");
      setMsg("คุณไม่ใช่ owner ของสัญญานี้");
      return;
    }

    setText("ownerStatus", "Connected as Owner ✓");
    setMsg("");

    // auto refresh ข้อมูล
    await refreshData();

    // ถ้าเปลี่ยน account / chain ให้ reload
    if (injected && injected.on) {
      injected.on("accountsChanged", () => window.location.reload());
      injected.on("chainChanged", () => window.location.reload());
    }
  } catch (err) {
    console.error("connectWallet error:", err);
    setMsg("Connect failed: " + (err.message || err));
  }
}

//================== READ CONTRACT DATA ==================
async function refreshData() {
  try {
    if (!stakeRead) return;

    // 1) THBC in contract
    const thbcAddr = await stakeRead.thbc(); // ฟังก์ชันในสัญญา
    if (!thbcRead) {
      const erc20Abi = ["function balanceOf(address) view returns (uint256)"];
      thbcRead = new ethers.Contract(thbcAddr, erc20Abi, provider);
    }
    const thbcBal = await thbcRead.balanceOf(THBC_KJC_CONFIG.stake.address);

    // 2) KJC locked total
    const kjcLocked = await stakeRead.totalStakedKjc();

    // 3) Reward owed (ถ้าสัญญามี, ถ้าไม่มีก็ catch ไป)
    let rewardOwedText = "-";
    try {
      const rewardOwed = await stakeRead.totalRewardOwed();
      rewardOwedText = ethers.utils.formatUnits(rewardOwed, 18);
    } catch (e) {
      rewardOwedText = "-";
    }

    setText("thbcIn", ethers.utils.formatUnits(thbcBal, 18));
    setText("kjcLocked", ethers.utils.formatUnits(kjcLocked, 18));
    setText("rewardOwed", rewardOwedText);
  } catch (err) {
    console.error("refreshData error:", err);
    setMsg("Refresh data error: " + (err.message || err));
  }
}

//================== UPDATE RATE ==================
async function updateRate() {
  try {
    if (!stakeWrite) await connectWallet();
    if (!stakeWrite) return;

    const val = $("rate").value.trim();
    if (!val) {
      alert("กรุณากรอก Rate เช่น 1.9");
      return;
    }

    const bn = ethers.utils.parseUnits(val, 18); // rateKjcPerThbc เป็น 18 decimals
    setMsg("Updating rate...");
    const tx = await stakeWrite.setRateKjcPerThbc(bn);
    await tx.wait();
    setMsg("Rate updated ✅");
    await refreshData();
  } catch (err) {
    console.error("updateRate error:", err);
    setMsg("Update rate failed: " + (err.message || err));
  }
}

//================== UPDATE APY ==================
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
    if (isNaN(num)) {
      alert("รูปแบบ APY ไม่ถูกต้อง");
      return;
    }

    const bps = Math.round(num * 100); // 15% → 1500
    setMsg("Updating APY...");
    const tx = await stakeWrite.setAPY(bps);
    await tx.wait();
    setMsg("APY updated ✅");
    await refreshData();
  } catch (err) {
    console.error("updateApy error:", err);
    setMsg("Update APY failed: " + (err.message || err));
  }
}

//================== UPDATE LOCK DURATION ==================
async function updateLock() {
  try {
    if (!stakeWrite) await connectWallet();
    if (!stakeWrite) return;

    const val = $("days").value.trim();
    if (!val) {
      alert("กรุณากรอกจำนวนวัน lock");
      return;
    }
    const d = parseInt(val, 10);
    if (isNaN(d) || d <= 0) {
      alert("จำนวนวันต้องเป็นตัวเลขมากกว่า 0");
      return;
    }

    const sec = d * 24 * 60 * 60;
    setMsg("Updating lock duration...");
    const tx = await stakeWrite.setLockDuration(sec);
    await tx.wait();
    setMsg("Lock duration updated ✅");
    await refreshData();
  } catch (err) {
    console.error("updateLock error:", err);
    setMsg("Update lock duration failed: " + (err.message || err));
  }
}

//================== WITHDRAW ALL THBC ==================
async function withdrawThbcAll() {
  try {
    if (!stakeWrite) await connectWallet();
    if (!stakeWrite) return;

    if (!window.confirm("ดึง THBC ทั้งหมดในสัญญากลับเข้ากระเป๋า Owner ใช่หรือไม่?")) {
      return;
    }

    // อ่านที่คอนแทรกต์ แล้วใช้ฟังก์ชัน withdrawToken(token, to, amount)
    const thbcAddr = await stakeRead.thbc();
    const bal = await thbcRead.balanceOf(THBC_KJC_CONFIG.stake.address);

    if (bal.isZero()) {
      setMsg("ไม่มี THBC ในสัญญา");
      return;
    }

    setMsg("Withdrawing THBC...");
    const tx = await stakeWrite.withdrawToken(thbcAddr, currentAccount, bal);
    await tx.wait();
    setMsg("Withdraw THBC success ✅");
    await refreshData();
  } catch (err) {
    console.error("withdrawThbcAll error:", err);
    setMsg("Withdraw THBC failed: " + (err.message || err));
  }
}

//================== BIND BUTTONS AFTER LOAD ==================
window.addEventListener("load", () => {
  const btnConnect = $("btnConnect") || $("btnConnectOwner");
  if (btnConnect) btnConnect.onclick = connectWallet;

  const btnRate = $("btnRate");
  if (btnRate) btnRate.onclick = updateRate;

  const btnApy = $("btnApy");
  if (btnApy) btnApy.onclick = updateApy;

  const btnLock = $("btnLock");
  if (btnLock) btnLock.onclick = updateLock;

  const btnWd = $("btnWithdrawThbc");
  if (btnWd) btnWd.onclick = withdrawThbcAll;
});
