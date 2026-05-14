/**
 * 兵推遊戲引擎 — 核心計算服務
 *
 * 所有規則係數集中於 DEFAULT_PARAMS，可透過 /api/params 動態覆蓋。
 */

const DEFAULT_PARAMS = {
  initial: {
    opinion: 60,
    attackProb: 60,
    baseFund: 100,
    totalBlackoutWeeks: 5,
  },
  // index = 承諾年數 (0-5)
  atkTable: [0, 10, 18, 24, 28, 30],
  opTable:  [0,  8, 14, 18, 20, 21],
  // 限電週數 → 台積電可用資金
  fundTable: { 1: 120, 2: 110, 3: 100, 4: 90, 5: 80 },
  thinkTank: {
    techThreshold: 40,   // 技術轉移 ≤ 此值才可背書
    yearThreshold: 3,    // 承諾年數 ≥ 此值才可背書
    fundThreshold: 30,   // 扣除美方資金後餘額 ≥ 此值才可背書
    reward: 30,          // 背書所需撥入基金
    opBonus: 20,         // 背書帶來的民意加成
  },
  defense: {
    atkBonus: 10,        // 攻台機率降幅
    negotiatedCost: 10,  // 協商同意的資金消耗
    forcedCost: 5,       // 強制執行的資金消耗
    opBonus: 2,          // 民意加成
    forcedPenalty: 20,   // 強制執行的民意懲罰
  },
  opinion: {
    civBlackoutPerWeek: 10,     // 民生限電每週民意扣分
    techPenaltyThreshold: 50,   // 技術轉移超過此值才扣分
    techPenaltyStep: 10,        // 每超過此步距扣一級
    techPenaltyPerStep: 15,     // 每級扣分
    talentBonusDivisor: 10,     // 人才補貼分母
    talentBonusPerUnit: 3,      // 人才補貼每單位加分
    emergencyPenalty: 20,       // 緊急行政命令民意懲罰
    emergencyOrderMaxWeeks: 2,  // 台積電限電 ≤ 此值觸發緊急命令
    shutdownThreshold: 3,       // 台積電限電超過此值觸發停工民怨
    shutdownPerWeek: 6,         // 每超過一週的扣分
    industryCrisisPenalty: 20,  // 產業信心危機民意懲罰
    industryCrisisWeeks: 5,     // 台積電限電達此值觸發危機
    industryCrisisAtkIncrease: 10, // 危機帶來的攻台機率增加
  },
  victory: {
    opinionMin: 60,         // 民意達標下限
    attackMax: 30,          // 攻台機率達標上限
    attackClampMin: 20,     // 攻台機率最低夾值
    usVictoryTechMin: 60,   // 美方勝利：技術轉移下限
    usVictoryFundMin: 50,   // 美方勝利：資金下限
  },
  merger: {
    yearCapDivisor: 10,     // 承諾年數上限 = tech% ÷ 此值（max 5）
    techWeightTsmc: 40,     // 技術轉移談判：台積電偏好佔比（整數%）
    techWeightUs: 60,       // 技術轉移談判：美方偏好佔比（整數%）
    techMin: 30,            // 技術轉移最低值（%）
    techMax: 70,            // 技術轉移最高值（%）
    blackoutWeightTsmc: 55, // 限電週數談判：台積電偏好佔比（整數%）
    blackoutWeightGov: 45,  // 限電週數談判：行政院偏好佔比（整數%）
    blackoutMin: 1,         // 台積電限電最低週數
    blackoutMax: 5,         // 台積電限電最高週數
  },
};

/**
 * 計算單局兵推結果
 * @param {Object} negotiation - 談判輸入參數
 * @param {Object} [cfg=DEFAULT_PARAMS] - 遊戲規則參數（可由 /api/params 覆蓋）
 */
function calculateGame(negotiation, cfg = DEFAULT_PARAMS) {
  const {
    techTransfer,
    usFund,
    usYears,
    tsmcBlackoutWeeks,
    defenseMode = 'none',
  } = negotiation;

  const P = cfg;
  const tsmcFund = (P.fundTable[tsmcBlackoutWeeks] ?? P.fundTable[5]) || 80;
  const civBlackoutWeeks = P.initial.totalBlackoutWeeks - tsmcBlackoutWeeks;
  const emergencyOrder = tsmcBlackoutWeeks <= P.opinion.emergencyOrderMaxWeeks;

  // === 智庫背書 ===
  const afterUSFund = tsmcFund - usFund;
  const thinkTankTechOk = techTransfer <= P.thinkTank.techThreshold;
  const thinkTankYearOk = usYears >= P.thinkTank.yearThreshold;
  const thinkTankFundOk = afterUSFund >= P.thinkTank.fundThreshold;
  const thinkTankEndorsed = thinkTankTechOk && thinkTankYearOk && thinkTankFundOk;
  const thinkTankFund = thinkTankEndorsed ? P.thinkTank.reward : 0;
  const afterThinkTank = afterUSFund - thinkTankFund;

  // === 國防供應 ===
  const defenseActive = defenseMode === 'negotiated' || defenseMode === 'forced';
  const defenseFundCost = defenseMode === 'negotiated'
    ? P.defense.negotiatedCost
    : defenseMode === 'forced' ? P.defense.forcedCost : 0;
  const defenseForced = defenseMode === 'forced';

  // === 人才補貼 ===
  const talentFund = Math.max(0, afterThinkTank - defenseFundCost);

  // === 攻台機率 ===
  const baseAtkReduction = P.atkTable[usYears] || 0;
  const industryCrisisAtkIncrease = tsmcBlackoutWeeks === P.opinion.industryCrisisWeeks
    ? P.opinion.industryCrisisAtkIncrease : 0;
  const baseAtk = Math.min(100, Math.max(P.victory.attackClampMin,
    P.initial.attackProb - baseAtkReduction + industryCrisisAtkIncrease));
  const finalAtk = Math.max(P.victory.attackClampMin,
    baseAtk - (defenseActive ? P.defense.atkBonus : 0));

  // === 民意 ===
  const opBon = P.opTable[usYears] || 0;
  const civPenalty = -(civBlackoutWeeks * P.opinion.civBlackoutPerWeek);
  const techPenalty = techTransfer > P.opinion.techPenaltyThreshold
    ? -Math.floor((techTransfer - P.opinion.techPenaltyThreshold) / P.opinion.techPenaltyStep)
      * P.opinion.techPenaltyPerStep
    : 0;
  const talentBonus = Math.floor(talentFund / P.opinion.talentBonusDivisor)
    * P.opinion.talentBonusPerUnit;
  const thinkTankBonus = thinkTankEndorsed ? P.thinkTank.opBonus : 0;
  const emergencyPenalty = emergencyOrder ? -P.opinion.emergencyPenalty : 0;
  const forcePenalty = defenseForced ? -P.defense.forcedPenalty : 0;
  const defenseOpBonus = defenseActive ? P.defense.opBonus : 0;
  const shutdownPenalty = tsmcBlackoutWeeks > P.opinion.shutdownThreshold
    ? -(tsmcBlackoutWeeks - P.opinion.shutdownThreshold) * P.opinion.shutdownPerWeek : 0;
  const industryCrisis = tsmcBlackoutWeeks === P.opinion.industryCrisisWeeks
    ? -P.opinion.industryCrisisPenalty : 0;

  const finalOp = P.initial.opinion
    + civPenalty + techPenalty + opBon + talentBonus + thinkTankBonus
    + emergencyPenalty + forcePenalty + defenseOpBonus + shutdownPenalty + industryCrisis;

  // === 達標判定 ===
  const opOk = finalOp >= P.victory.opinionMin;
  const atkOk = finalAtk <= P.victory.attackMax;
  const allOk = opOk && atkOk;
  const usVictoryOk = atkOk
    && (techTransfer >= P.victory.usVictoryTechMin || usFund >= P.victory.usVictoryFundMin);

  // === 明細 ===
  const fundBreakdown = {
    total: tsmcFund,
    toUS: usFund,
    toThinkTank: thinkTankFund,
    toDefense: defenseFundCost,
    toTalent: talentFund,
    sum: usFund + thinkTankFund + defenseFundCost + talentFund,
  };

  const opinionBreakdown = {
    initial: P.initial.opinion,
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

  const attackBreakdown = {
    initial: P.initial.attackProb,
    usCommitmentReduction: -baseAtkReduction,
    industryCrisisIncrease: industryCrisisAtkIncrease,
    defenseReduction: defenseActive ? -P.defense.atkBonus : 0,
    final: finalAtk,
  };

  // 逐年明細（從表格差分）
  const yearlyAtk = [];
  const yearlyOp = [];
  for (let i = 1; i <= usYears; i++) {
    yearlyAtk.push((P.atkTable[i] || 0) - (P.atkTable[i - 1] || 0));
    yearlyOp.push((P.opTable[i] || 0) - (P.opTable[i - 1] || 0));
  }

  const specialClauses = [];
  if (emergencyOrder)
    specialClauses.push({ type: 'emergency', label: '緊急行政命令', penalty: -P.opinion.emergencyPenalty });
  if (defenseForced)
    specialClauses.push({ type: 'forced_defense', label: '強制國防供應', penalty: -P.defense.forcedPenalty });
  if (shutdownPenalty < 0)
    specialClauses.push({ type: 'shutdown', label: `台積電停工民怨 (${tsmcBlackoutWeeks - P.opinion.shutdownThreshold}週)`, penalty: shutdownPenalty });
  if (industryCrisis < 0)
    specialClauses.push({ type: 'industry_crisis', label: '產業信心危機', penalty: -P.opinion.industryCrisisPenalty });

  return {
    finalOpinion: Math.round(finalOp),
    finalAttack: finalAtk,
    opinionOk: opOk,
    attackOk: atkOk,
    allOk,
    usVictoryOk,
    params: { techTransfer, usFund, usYears, tsmcBlackoutWeeks, civBlackoutWeeks, defenseMode },
    fundBreakdown,
    opinionBreakdown,
    attackBreakdown,
    yearlyAtk,
    yearlyOp,
    thinkTankEndorsed,
    thinkTankConditions: { techOk: thinkTankTechOk, yearOk: thinkTankYearOk, fundOk: thinkTankFundOk },
    emergencyOrder,
    specialClauses,
  };
}

/**
 * 蒙地卡羅模擬
 * @param {number} count
 * @param {Object} [cfg=DEFAULT_PARAMS]
 */
function runMonteCarlo(count = 1000, cfg = DEFAULT_PARAMS) {
  const P = cfg;
  const ri  = (a, b, s) => a + Math.floor(Math.random() * (Math.floor((b - a) / s) + 1)) * s;
  const riL = (a, b, s) => { const n = Math.floor((b - a) / s); const i = Math.floor(Math.pow(Math.random(), 1.8) * (n + 1)); return a + Math.min(i, n) * s; };
  const riH = (a, b, s) => { const n = Math.floor((b - a) / s); const i = Math.floor(Math.pow(Math.random(), 1.8) * (n + 1)); return b - Math.min(i, n) * s; };

  const results = [];

  for (let i = 0; i < count; i++) {
    const tsmcTech  = riL(30, 50, 10);
    const tsmcWkPref = riL(2, 4, 1);
    const usTech    = riH(40, 70, 10);
    const usFund    = riH(40, 60, 10);
    const usYrPref  = riL(2, 4, 1);
    const govWkPref = ri(3, 5, 1);

    const techRaw = Math.round((tsmcTech * (P.merger.techWeightTsmc / 100) + usTech * (P.merger.techWeightUs / 100)) / 10) * 10;
    const tech = Math.min(P.merger.techMax, Math.max(P.merger.techMin, techRaw));

    let usYears = usYrPref;
    if (Math.random() < 0.5 && usYears < 5) usYears = Math.min(5, usYears + 1);
    const yearCap = Math.min(5, Math.floor(tech / P.merger.yearCapDivisor));
    usYears = Math.min(usYears, yearCap);

    const wkRaw = Math.round(tsmcWkPref * (P.merger.blackoutWeightTsmc / 100) + govWkPref * (P.merger.blackoutWeightGov / 100));
    const tsmcWks = Math.min(P.merger.blackoutMax, Math.max(P.merger.blackoutMin, wkRaw));

    const base = (P.fundTable[tsmcWks] ?? P.fundTable[5]) || 80;
    const afterUS = base - usFund;
    const ttOn = tech <= P.thinkTank.techThreshold
      && usYears >= P.thinkTank.yearThreshold
      && afterUS >= P.thinkTank.fundThreshold;
    const afterTT = afterUS - (ttOn ? P.thinkTank.reward : 0);

    const baseAtkRed = P.atkTable[usYears] || 0;
    const baseAtk = Math.max(P.victory.attackClampMin, P.initial.attackProb - baseAtkRed);
    const govWantsDefense = Math.random() < (baseAtk > P.victory.attackMax ? 0.75 : baseAtk === P.victory.attackMax ? 0.3 : 0.1);
    const tsmcRefuseProb = tsmcWks >= 4 ? 0.75 : tsmcWks <= 2 ? 0.45 : 0.60;
    const tsmcRefuses = Math.random() < tsmcRefuseProb;
    const canAffordDefense = afterTT >= P.defense.negotiatedCost;

    let defenseMode = 'none';
    if (govWantsDefense) {
      if (!canAffordDefense) {
        defenseMode = 'nobudget';
      } else if (!tsmcRefuses) {
        defenseMode = 'negotiated';
      } else {
        defenseMode = Math.random() < (baseAtk > P.victory.attackMax ? 0.65 : 0.2) ? 'forced' : 'dropped';
      }
    }

    const result = calculateGame({
      techTransfer: tech, usFund, usYears, tsmcBlackoutWeeks: tsmcWks, defenseMode,
    }, P);

    results.push({ ...result, negotiation: { tsmcTechPref: tsmcTech, usTechPref: usTech } });
  }

  const all    = results.filter(r => r.allOk);
  const opOnly = results.filter(r => r.opinionOk && !r.attackOk);
  const atkOnly = results.filter(r => !r.opinionOk && r.attackOk);
  const none   = results.filter(r => !r.opinionOk && !r.attackOk);

  const opinions = results.map(r => r.finalOpinion);
  const attacks  = results.map(r => r.finalAttack);
  const avgOp  = Math.round(opinions.reduce((a, b) => a + b, 0) / count);
  const avgAtk = Math.round(attacks.reduce((a, b) => a + b, 0) / count);
  const ttCount  = results.filter(r => r.thinkTankEndorsed).length;
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
    results: results.slice(0, 20),
  };
}

// 保持向後相容的具名匯出
const ATK_TABLE  = DEFAULT_PARAMS.atkTable;
const OP_TABLE   = DEFAULT_PARAMS.opTable;
const FUND_TABLE = DEFAULT_PARAMS.fundTable;
const INITIAL    = DEFAULT_PARAMS.initial;

module.exports = { calculateGame, runMonteCarlo, DEFAULT_PARAMS, ATK_TABLE, OP_TABLE, FUND_TABLE, INITIAL };
