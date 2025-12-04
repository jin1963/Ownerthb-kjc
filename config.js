// config.js  – สำหรับ Owner Admin THBC → KJC

// BNB Smart Chain mainnet
const THBC_KJC_CONFIG = {
  chainId: 56,

  stake: {
    // ที่อยู่สัญญา THBC→KJC Auto-Stake
    address: "0xc715253f8De35707Bd69bBE065FA561778cfA094",

    // ABI แบบย่อ สำหรับฟังก์ชันที่หน้าเว็บ owner ใช้จริง ๆ
    abi: [
      // basic info
      "function owner() view returns (address)",
      "function thbc() view returns (address)",
      "function kjc() view returns (address)",

      // parameters
      "function rateKjcPerThbc() view returns (uint256)",
      "function apyBps() view returns (uint256)",
      "function lockDuration() view returns (uint256)",
      "function totalKjcLocked() view returns (uint256)",

      // admin setters
      "function setRateKjcPerThbc(uint256 _rateKjcPerThbc) external",
      "function setAPY(uint256 _apyBps) external",
      "function setLockDuration(uint256 _lockDuration) external",

      // อันล่างเผื่อไว้ให้ dApp user ใช้ร่วมกันได้
      "function swapAndStake(uint256 thbcAmount) external",
      "function claimAll() external",
      "function getStakeCount(address user) view returns (uint256)",
      "function getStake(address user, uint256 index) view returns (uint256 principal, uint256 reward, uint256 startTime, bool claimed)"
    ]
  }
};
