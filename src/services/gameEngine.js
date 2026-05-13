/**
 * 兵推遊戲引擎 — 核心計算服務
 * 
 * 實作規則手冊 v9 版完整規則：
 * - 攻台機率遞減機制
 * - 民意遞減機制
 * - 智庫背書條件
 * - 國防供應談判
 * - 特殊條款觸發
 */

// 攻台機率累積降幅表 (index = 承諾年數)
const ATK_TABLE = [0, 10, 18, 24, 28, 30];

// 民意累積增加表 (index = 承諾年數)
const OP_TABLE = [0, 8, 14, 18, 20, 21];

// 台積電資金表 (限電週數 → 可用資金)
const FUND_TABLE = { 1: 120, 2: 110, 3: 100, 4: 90, 5: 80 };

// 初始條件
const INITIAL = {
  opinion: 60,
  attackProb: 60,
  baseFund: 80,
  totalBlackoutWeeks: 5,
};

/**
 * 計算單局兵推結果
 * @param {Object} params - 談判參數
 * @param {number} params.techTransfer - 技術轉移比例 (30-70, step 10)
 * @param {number} params.usFund - 給美方資金 (30-60 億)
 * @param {number} params.usYears - 美方安全承諾年數 (1-5)
 * @param {number} params.tsmcBlackoutWeeks - 台積電限電週數 (1-5)
 * @param {boolean} params.defenseSupply - 是否執行國防供應
 * @param {string} params.defenseMode - 國防供應模式: 'none' | 'negotiated' | 'forced'
 * @returns {Object} 完整計算結果
 */
function calculateGame(params) {
  const {
    techTransfer,
    usFund,
    usYears,
    tsmcBlackoutWeeks,
    defenseSupply = false,
    defenseMode = 'none',
  } = params;

  // === 基礎計算 ===
  const civBlackoutWeeks = INITIAL.totalBlackoutWeeks - tsmcBlackoutWeeks;
  const tsmcFund = FUND_TABLE[tsmcBlackoutWeeks] || 80;
  const emergencyOrder = tsmcBlackoutWeeks <= 2;

  // === 智庫背書檢查 ===
  const afterUSFund = tsmcFund - usFund;
  const thinkTankTechOk = techTransfer <= 40;
  const thinkTankYearOk = usYears >= 3;
  const thinkTankFundOk = afterUSFund >= 30;
  const thinkTankEndorsed = thinkTankTechOk && thinkTankYearOk && thinkTankFundOk;
  const thinkTankFund = thinkTankEndorsed ? 30 : 0;
  const afterThinkTank = afterUSFund - thinkTankFund;

  // === 國防供應 ===
  const defenseActive = defenseMode === 'negotiated' || defenseMode === 'forced';
  const defenseFundCost = defenseMode === 'negotiated' ? 10 : defenseMode === 'forced' ? 5 : 0;
  const defenseAtkBonus = defenseActive ? 10 : 0;
  const defenseForced = defenseMode === 'forced';

  // === 人才補貼 ===
  const talentFund = Math.max(0, afterThinkTank - defenseFundCost);

  // === 攻台機率計算 ===
  const baseAtkReduction = ATK_TABLE[usYears] || 0;
  const industryCrisisAtkIncrease = tsmcBlackoutWeeks === 5 ? 10 : 0;
  const baseAtk = Math.min(100, Math.max(20, INITIAL.attackProb - baseAtkReduction + industryCrisisAtkIncrease));
  const finalAtk = Math.max(20, baseAtk - defenseAtkBonus);

  // === 民意計算 ===
  const opBon = OP_TABLE[usYears] || 0;
  const civPenalty = -(civBlackoutWeeks * 10);
  const techPenalty = techTransfer > 50
    ? -Math.floor((techTransfer - 50) / 10) * 15
    : 0;
  const talentBonus = Math.floor(talentFund / 10) * 3;
  const thinkTankBonus = thinkTankEndorsed ? 20 : 0;
  const emergencyPenalty = emergencyOrder ? -20 : 0;
  const forcePenalty = defenseForced ? -20 : 0;
  const defenseOpBonus = defenseActive ? 2 : 0;

  // 停工民怨
  const shutdownPenalty = tsmcBlackoutWeeks > 3
    ? -(tsmcBlackoutWeeks - 3) * 6
    : 0;

  // 產業信心危機
  const industryCrisis = tsmcBlackoutWeeks === 5 ? -20 : 0;

  const finalOp = INITIAL.opinion
    + civPenalty
    + techPenalty
    + opBon
    + talentBonus
    + thinkTankBonus
    + emergencyPenalty
    + forcePenalty
    + defenseOpBonus
    + shutdownPenalty
    + industryCrisis;

  // === 達標判定 ===
  const opOk = finalOp >= 60;
  const atkOk = finalAtk <= 30;
  const allOk = opOk && atkOk;
  const usVictoryOk = atkOk && (techTransfer >= 60 || usFund >= 50);

  // === 資金分配明細 ===
  const fundBreakdown = {
    total: tsmcFund,
    toUS: usFund,
    toThinkTank: thinkTankFund,
    toDefense: defenseFundCost,
    toTalent: talentFund,
    sum: usFund + thinkTankFund + defenseFundCost + talentFund,
  };

  // === 民意計算明細 ===
  const opinionBreakdown = {
    initial: INITIAL.opinion,
    civBlackout: civPenalty,
    techPenalty,
    usCommitmentBonus: opBon,
    talentBonus,
    thinkTankBonus,
    emergencyPenalty,
    forcePenalty,
    defenseOpBonus,
    shutdownPenalty,
    industryCrisis,
    final: Math.round(finalOp),
  };

  // === 攻台計算明細 ===
  const attackBreakdown = {
    initial: INITIAL.attackProb,
    usCommitmentReduction: -baseAtkReduction,
    industryCrisisIncrease: industryCrisisAtkIncrease,
    defenseReduction: defenseActive ? -10 : 0,
    final: finalAtk,
  };

  // === 年度明細 ===
  const yearlyAtk = [10, 8, 6, 4, 2].slice(0, usYears);
  const yearlyOp = [8, 6, 4, 2, 1].slice(0, usYears);

  // === 特殊條款 ===
  const specialClauses = [];
  if (emergencyOrder) specialClauses.push({ type: 'emergency', label: '緊急行政命令', penalty: -20 });
  if (defenseForced) specialClauses.push({ type: 'forced_defense', label: '強制國防供應', penalty: -20 });
  if (shutdownPenalty < 0) specialClauses.push({ type: 'shutdown', label: `台積電停工民怨 (${tsmcBlackoutWeeks - 3}週)`, penalty: shutdownPenalty });
  if (industryCrisis < 0) specialClauses.push({ type: 'industry_crisis', label: '產業信心危機', penalty: -20 });

  return {
    // 最終結果
    finalOpinion: Math.round(finalOp),
    finalAttack: finalAtk,
    opinionOk: opOk,
    attackOk: atkOk,
    allOk,
    usVictoryOk,

    // 輸入參數
    params: {
      techTransfer,
      usFund,
      usYears,
      tsmcBlackoutWeeks,
      civBlackoutWeeks,
      defenseMode,
    },

    // 明細
    fundBreakdown,
    opinionBreakdown,
    attackBreakdown,
    yearlyAtk,
    yearlyOp,

    // 狀態
    thinkTankEndorsed,
    thinkTankConditions: {
      techOk: thinkTankTechOk,
      yearOk: thinkTankYearOk,
      fundOk: thinkTankFundOk,
    },
    emergencyOrder,
    specialClauses,
  };
}

/**
 * 蒙地卡羅模擬 — 隨機生成多組談判參數並計算統計
 * @param {number} count - 模擬次數
 * @returns {Object} 統計結果
 */
function runMonteCarlo(count = 1000) {
  const ri = (a, b, s) => a + Math.floor(Math.random() * (Math.floor((b - a) / s) + 1)) * s;
  const riL = (a, b, s) => {
    const n = Math.floor((b - a) / s);
    const i = Math.floor(Math.pow(Math.random(), 1.8) * (n + 1));
    return a + Math.min(i, n) * s;
  };
  const riH = (a, b, s) => {
    const n = Math.floor((b - a) / s);
    const i = Math.floor(Math.pow(Math.random(), 1.8) * (n + 1));
    return b - Math.min(i, n) * s;
  };

  const results = [];

  for (let i = 0; i < count; i++) {
    // 各方偏好
    const tsmcTech = riL(30, 50, 10);
    const tsmcWkPref = riL(2, 4, 1);
    const usTech = riH(40, 70, 10);
    const usFund = riH(40, 60, 10);
    const usYrPref = riL(2, 4, 1);
    const govWkPref = ri(3, 5, 1);

    // 技術協商
    const techRaw = Math.round((tsmcTech * 0.4 + usTech * 0.6) / 10) * 10;
    const tech = Math.min(70, Math.max(30, techRaw));

    // 承諾年數協商
    let usYears = usYrPref;
    if (tech >= 60) usYears = Math.min(5, usYears + 1);
    if (usFund >= 50) usYears = Math.min(5, usYears + 1);
    const govSwap = Math.random() < 0.5;
    if (govSwap && usYears < 5) {
      usYears = Math.min(5, usYears + 1);
    }

    // 限電協商
    const wkRaw = Math.round(tsmcWkPref * 0.55 + govWkPref * 0.45);
    const tsmcWks = Math.min(5, Math.max(1, wkRaw));

    // 國防供應談判
    const base = FUND_TABLE[tsmcWks];
    const afterUS = base - usFund;
    const ttOk = tech <= 40;
    const yrOk = usYears >= 3;
    const fundOk = afterUS >= 30;
    const ttOn = ttOk && yrOk && fundOk;
    const ttFund = ttOn ? 30 : 0;
    const afterTT = afterUS - ttFund;

    const baseAtkRed = ATK_TABLE[usYears];
    const baseAtk = Math.max(20, 60 - baseAtkRed);
    const govWantsDefense = Math.random() < (baseAtk > 30 ? 0.75 : baseAtk === 30 ? 0.3 : 0.1);
    const tsmcRefuseProb = tsmcWks >= 4 ? 0.75 : tsmcWks <= 2 ? 0.45 : 0.60;
    const tsmcRefuses = Math.random() < tsmcRefuseProb;
    const canAffordDefense = afterTT >= 10;

    let defenseMode = 'none';
    let defenseAtkBonus = 0;
    let defenseFundCost = 0;
    let govForcePenalty = 0;

    if (govWantsDefense) {
      if (!canAffordDefense) {
        defenseMode = 'nobudget';
      } else if (!tsmcRefuses) {
        defenseMode = 'negotiated';
        defenseAtkBonus = 10;
        defenseFundCost = 10;
      } else {
        const govForces = Math.random() < (baseAtk > 30 ? 0.65 : 0.2);
        if (govForces) {
          defenseMode = 'forced';
          defenseAtkBonus = 10;
          defenseFundCost = 5;
          govForcePenalty = -20;
        } else {
          defenseMode = 'dropped';
        }
      }
    }

    const result = calculateGame({
      techTransfer: tech,
      usFund,
      usYears,
      tsmcBlackoutWeeks: tsmcWks,
      defenseSupply: defenseMode === 'negotiated' || defenseMode === 'forced',
      defenseMode,
    });

    results.push({
      ...result,
      negotiation: {
        tsmcTechPref: tsmcTech,
        usTechPref: usTech,
        govSwap,
      },
    });
  }

  // 統計
  const all = results.filter(r => r.allOk);
  const opOnly = results.filter(r => r.opinionOk && !r.attackOk);
  const atkOnly = results.filter(r => !r.opinionOk && r.attackOk);
  const none = results.filter(r => !r.opinionOk && !r.attackOk);

  const opinions = results.map(r => r.finalOpinion);
  const attacks = results.map(r => r.finalAttack);

  const avgOp = Math.round(opinions.reduce((a, b) => a + b, 0) / count);
  const avgAtk = Math.round(attacks.reduce((a, b) => a + b, 0) / count);

  const ttCount = results.filter(r => r.thinkTankEndorsed).length;
  const emgCount = results.filter(r => r.emergencyOrder).length;

  return {
    count,
    summary: {
      allPass: all.length,
      opinionOnlyPass: opOnly.length,
      attackOnlyPass: atkOnly.length,
      bothFail: none.length,
      allPassRate: Math.round(all.length / count * 100),
      attackPassRate: Math.round((all.length + atkOnly.length) / count * 100),
      opinionPassRate: Math.round((all.length + opOnly.length) / count * 100),
    },
    statistics: {
      avgOpinion: avgOp,
      avgAttack: avgAtk,
      minOpinion: Math.min(...opinions),
      maxOpinion: Math.max(...opinions),
      minAttack: Math.min(...attacks),
      maxAttack: Math.max(...attacks),
      thinkTankRate: Math.round(ttCount / count * 100),
      emergencyRate: Math.round(emgCount / count * 100),
    },
    results: results.slice(0, 20), // Return first 20 detailed results
  };
}

module.exports = { calculateGame, runMonteCarlo, ATK_TABLE, OP_TABLE, FUND_TABLE, INITIAL };
