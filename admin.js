let provider, signer, stakeWrite, stakeRead;
let currentAccount = null;

function $(id) {
    return document.getElementById(id);
}

async function connectWallet() {
    try {
        const injected = window.ethereum || window.BinanceChain || (window.bitget && window.bitget.ethereum);
        if (!injected) {
            alert("No Web3 wallet found");
            return;
        }

        provider = new ethers.providers.Web3Provider(injected, "any");
        const acc = await provider.send("eth_requestAccounts", []);
        currentAccount = acc[0];
        signer = provider.getSigner();

        const net = await provider.getNetwork();
        if (net.chainId !== THBC_KJC_CONFIG.chainId) {
            alert("Wrong Network! Please switch to BNB Chain");
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

        const owner = await stakeWrite.owner();
        if (owner.toLowerCase() !== currentAccount.toLowerCase()) {
            $("ownerStatus").textContent = "Not Owner ❌";
            return;
        }

        $("ownerStatus").textContent = "Connected as Owner ✓";
        refreshData();

    } catch (err) {
        console.error(err);
    }
}

async function refreshData() {
    try {
        const thbc = await stakeRead.totalThbcReceived();
        const kjc = await stakeRead.totalStakedKjc();
        const reward = await stakeRead.totalRewardOwed();

        $("thbcIn").textContent = ethers.utils.formatUnits(thbc, 18);
        $("kjcLocked").textContent = ethers.utils.formatUnits(kjc, 18);
        $("rewardOwed").textContent = ethers.utils.formatUnits(reward, 18);
    } catch (err) {
        console.error("refreshData error:", err);
    }
}

// Update Rate
$("btnRate").onclick = async () => {
    try {
        const val = $("rate").value.trim();
        const bn = ethers.utils.parseUnits(val, 18);
        const tx = await stakeWrite.setRateKjcPerThbc(bn);
        await tx.wait();
        setMsg("Rate updated");
        refreshData();
    } catch (err) {
        setMsg("Update rate failed: " + err.message, true);
    }
};

// Update APY
$("btnApy").onclick = async () => {
    try {
        const val = parseFloat($("apy").value.trim());
        const bps = Math.round(val * 100);
        const tx = await stakeWrite.setApyBps(bps);
        await tx.wait();
        setMsg("APY updated");
        refreshData();
    } catch (err) {
        setMsg("Update APY failed: " + err.message, true);
    }
};

// Update Lock days
$("btnLock").onclick = async () => {
    try {
        const val = parseInt($("days").value.trim(), 10);
        const sec = val * 24 * 60 * 60;
        const tx = await stakeWrite.setLockDuration(sec);
        await tx.wait();
        setMsg("Lock Duration updated");
        refreshData();
    } catch (err) {
        setMsg("Update Lock Duration failed: " + err.message, true);
    }
};

$("btnConnect").onclick = connectWallet;

function setMsg(msg) {
    $("txMessage").textContent = msg;
}
