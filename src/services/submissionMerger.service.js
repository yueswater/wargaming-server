function mergeSubmissions({ tsmc, gov, us, thinktank }) {
  // Tech transfer: TSMC wants low, US demands high
  const techTransfer = Math.min(
    70,
    Math.max(
      30,
      Math.round((tsmc.techTransferPreference * 0.4 + us.usTechDemand * 0.6) / 10) * 10,
    ),
  );

  // US fund and years come directly from US position
  const usFund = us.usFund;
  let usYears = us.usYears;

  // GOV can negotiate up security commitment (if gov grants emergency order or tech is high)
  if (gov.emergencyOrderIntent && usYears < 5) usYears = Math.min(5, usYears + 1);
  if (techTransfer >= 60) usYears = Math.min(5, usYears + 1);

  // Blackout weeks: weighted negotiation between TSMC and GOV
  const tsmcBlackoutWeeks = Math.min(
    5,
    Math.max(
      1,
      Math.round(tsmc.tsmcBlackoutWeeks * 0.55 + gov.governmentBlackoutPreference * 0.45),
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
