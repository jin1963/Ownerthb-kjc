let provider, signer, stakeWrite, stakeRead, thbcRead;
let ownerAddress = null;

async function connect() {
  if (!window.ethereum) return alert("No wallet detected");

  provider = new ethers.providers.Web3Provider(window.ethereum, "any");
  await provider.send("eth_requestAccounts", []);
  signer = provider.getSigner();
  const account = await signer.getAddress();

  const cfg = window.THBC_KJC_CONFIG;
  stakeWrite = new ethers.Contract(cfg.stake.address, cfg.stake.abi, signer);
  stakeRead = stakeWrite.connect(provider);
  thbcRead = new ethers.Contract(cfg.thbc.address, cfg.thbc.abi, provider);

  ownerAddress = await stakeRead.owner();

  if (account.toLowerCase() !== ownerAddress.toLowerCase()) {
    document.getElementById("msg").textContent = "Not Owner ❌";
    disableAllButtons();
    return;
  }

  document.getElementById("addr").textContent = "Connected as Owner ✔";
  await refreshData();
}

function disableAllButtons() {
  document.querySelectorAll("button").forEach(btn => btn.disabled = true);
}

async function refreshData() {
  const cfg = window.THBC_KJC_CONFIG;
  const thbcBal = await thbcRead.balanceOf(cfg.stake.address);
  const kjcLocked = await stakeRead.totalKjcLocked();

  document.getElementById("thbcBal").textContent = ethers.utils.formatUnits(thbcBal, 18);
  document.getElementById("kjcLocked").textContent = ethers.utils.formatUnits(kjcLocked, 18);
}

/* Update Rate */
async function updateRate() {
  const val = parseFloat(document.getElementById("rateInput").value);
  const tx = await stakeWrite.setRateKjcPerThbc(ethers.utils.parseUnits(val.toString(), 18));
  await tx.wait();
  setMsg("Rate updated ✔", true);
}

/* Update APY */
async function updateAPY() {
  const val = parseFloat(document.getElementById("apyInput").value);
  const bps = Math.round(val * 100); // % → BPS
  const tx = await stakeWrite.setAPY(bps);
  await tx.wait();
  setMsg("APY updated ✔", true);
}

/* Update Lock Duration */
async function updateLock() {
  const days = parseInt(document.getElementById("lockInput").value);
  const seconds = days * 86400;
  const tx = await stakeWrite.setLockDuration(seconds);
  await tx.wait();
  setMsg("Lock updated ✔", true);
}

/* Withdraw THBC */
async function withdraw() {
  const val = ethers.utils.parseUnits(document.getElementById("withdrawAmount").value, 18);
  const cfg = window.THBC_KJC_CONFIG;
  const tx = await stakeWrite.withdrawToken(cfg.thbc.address, ownerAddress, val);
  await tx.wait();
  setMsg("Withdraw success ✔", true);
  await refreshData();
}

function setMsg(text, success = false) {
  const el = document.getElementById("msg");
  el.textContent = text;
  el.className = success ? "msg msg-success" : "msg msg-error";
}

window.addEventListener("load", () => {
  document.getElementById("btnConnect").onclick = connect;
  document.getElementById("btnRate").onclick = updateRate;
  document.getElementById("btnAPY").onclick = updateAPY;
  document.getElementById("btnLock").onclick = updateLock;
  document.getElementById("btnWithdraw").onclick = withdraw;
});
