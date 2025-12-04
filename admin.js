// admin.js – Owner panel THBC → KJC

let provider, signer, stakeWrite, stakeRead, thbcRead;
let currentAccount = null;
let thbcAddressInContract = null;    // เก็บ address THBC จากสัญญาไว้ใช้ซ้ำ

function $(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const el = $(id);
  if (!el) return; // ถ้าไม่มี element ก็ไม่เขียน จะได้ไม่พัง
  el.textContent = value;
}

function setMsg(text) {
  setText("txMessage", text);
}

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

    // ตรวจว่าเป็น owner หรือไม่
    const owner = await stakeRead.owner();
    if (owner.toLowerCase() !== currentAccount.toLowerCase()) {
      setText("ownerStatus", "Not Owner ❌");
      setMsg("คุณไม่ใช่ owner ของสัญญานี้");
      return;
    }

    setText("ownerStatus", "Connected as Owner ✓");
    setMsg("");

    // subscribe chain/account change
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

async function refreshData() {
  try {
    if (!stakeRead) return;

    // --- THBC in contract ---
    // thbc() => address token THBC
    thbcAddressInContract = await stakeRead.thbc();
    if (!thbcRead) {
      const erc20Abi = ["function balanceOf(address) view returns (uint256)"];
      thbcRead = new ethers.Contract(thbcAddressInContract, erc20Abi, provider);
    }

    const thbcBal = await thbcRead.balanceOf(THBC_KJC_CONFIG.stake.address);

    // --- KJC locked total ---
    const kjcLocked = await stakeRead.totalKjcLocked();

    // เขียนลงหน้าเว็บ
    setText("thbcIn", ethers.utils.formatUnits(thbcBal, 18));
    setText("kjcLocked", ethers.utils.formatUnits(kjcLocked, 18));

    // ยังไม่มีฟังก์ชัน sum reward ในสัญญา เลยแสดงเป็น "-" ไว้ก่อน
    setText("rewardOwed", "-");
  } catch (err) {
    console.error("refreshData error:", err);
    setMsg("Refresh data error: " + (err.message || err));
  }
}

// ----------------- Withdraw ALL THBC -----------------
async function withdrawThbcAll() {
  try {
    if (!stakeWrite) await connectWallet();
    if (!stakeWrite) return;

    setMsg("");

    // ถ้ายังไม่รู้ address THBC ให้ดึงจากสัญญาอีกรอบ
    if (!thbcAddressInContract) {
      thbcAddressInContract = await stakeRead.thbc();
    }
    if (!thbcRead) {
      const erc20Abi = ["function balanceOf(address) view returns (uint256)"];
      thbcRead = new ethers.Contract(thbcAddressInContract, erc20Abi, provider);
    }

    // ดูยอด THBC ที่ค้างอยู่ในสัญญา
    const thbcBal = await thbcRead.balanceOf(THBC_KJC_CONFIG.stake.address);
    if (thbcBal.isZero()) {
      setMsg("No THBC in contract to withdraw.");
      return;
    }

    setMsg("Withdrawing all THBC to owner...");
    // เรียก withdrawToken(token, to, amount)
    const tx = await stakeWrite.withdrawToken(
      thbcAddressInContract,
      currentAccount,
      thbcBal
    );
    await tx.wait();

    setMsg("Withdraw THBC success ✅");
    await refreshData();
  } catch (err) {
    console.error(err);
    setMsg("Withdraw THBC failed: " + (err.message || err));
  }
}

// ----------------- Update Rate -----------------
$("btnRate").onclick = async () => {
  try {
    if (!stakeWrite) await connectWallet();
    if (!stakeWrite) return;

    const val = $("rate").value.trim();
    if (!val) {
      alert("กรุณากรอก Rate เช่น 1.9");
      return;
    }
    const bn = ethers.utils.parseUnits(val, 18);
    const tx = await stakeWrite.setRateKjcPerThbc(bn);
    setMsg("Updating rate...");
    await tx.wait();
    setMsg("Rate updated ✅");
    await refreshData();
  } catch (err) {
    console.error(err);
    setMsg("Update rate failed: " + (err.message || err));
  }
};

// ----------------- Update APY -----------------
$("btnApy").onclick = async () => {
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
    const tx = await stakeWrite.setAPY(bps);
    setMsg("Updating APY...");
    await tx.wait();
    setMsg("APY updated ✅");
    await refreshData();
  } catch (err) {
    console.error(err);
    setMsg("Update APY failed: " + (err.message || err));
  }
};

// ----------------- Update Lock Duration -----------------
$("btnLock").onclick = async () => {
  try {
    if (!stakeWrite) await connectWallet();
    if (!stakeWrite) return;

    const val = $("days").value.trim();
    if (!val) {
      alert("กรุณากรอกจำนวนวัน lock");
      return;
    }
    const d = parseInt(val, 10);
    const sec = d * 24 * 60 * 60;
    const tx = await stakeWrite.setLockDuration(sec);
    setMsg("Updating lock duration...");
    await tx.wait();
    setMsg("Lock duration updated ✅");
    await refreshData();
  } catch (err) {
    console.error(err);
    setMsg("Update lock duration failed: " + (err.message || err));
  }
};

// ปุ่ม connect + ปุ่ม withdraw
$("btnConnect").onclick = connectWallet;
$("btnWithdrawThbcAll").onclick = withdrawThbcAll;
