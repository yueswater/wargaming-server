const { DEFAULT_PARAMS } = require('./gameEngine');

function mergeSubmissions({ tsmc, gov, us, thinktank }, params = DEFAULT_PARAMS) {
  const M = params.merger;

  // Tech transfer: weighted negotiation between TSMC and US
  const techTransfer = Math.min(
    M.techMax,
    Math.max(
      M.techMin,
      Math.round((tsmc.techTransferPreference * (M.techWeightTsmc / 100) + us.usTechDemand * (M.techWeightUs / 100)) / 10) * 10,
    ),
  );

  // US fund and years come directly from US position
  const usFund = us.usFund;
  let usYears = us.usYears;

  // GOV emergency order can push years up by 1
  if (gov.emergencyOrderIntent && usYears < 5) usYears = Math.min(5, usYears + 1);

  // Commitment year cap = tech% ÷ yearCapDivisor, max 5
  const yearCap = Math.min(5, Math.floor(techTransfer / M.yearCapDivisor));
  usYears = Math.min(usYears, yearCap);

  // Blackout weeks: weighted negotiation between TSMC and GOV
  const tsmcBlackoutWeeks = Math.min(
    M.blackoutMax,
    Math.max(
      M.blackoutMin,
      Math.round(tsmc.tsmcBlackoutWeeks * (M.blackoutWeightTsmc / 100) + gov.governmentBlackoutPreference * (M.blackoutWeightGov / 100)),
    ),
  );

  // Defense supply: GOV desire vs TSMC acceptance
  const govWantsDefense = gov.governmentDefensePosition !== 'none';
  let defenseMode = 'none';
  if (govWantsDefense) {
    if (tsmc.tsmcDefensePosition === 'accept') {
      defenseMode = 'negotiated';
    } else if (gov.governmentDefensePosition === 'forced') {
      defenseMode = 'forced';
    }
  }

  return { techTransfer, usFund, usYears, tsmcBlackoutWeeks, defenseMode };
}

module.exports = { mergeSubmissions };
