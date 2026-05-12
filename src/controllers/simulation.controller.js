const { calculateGame } = require('../services/gameEngine');
const { runMonteCarlo } = require('../services/gameEngine');

// POST /api/simulations/calculate — 單次計算
exports.calculate = (req, res) => {
  try {
    const result = calculateGame(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// POST /api/simulations/monte-carlo — 蒙地卡羅模擬
exports.monteCarlo = (req, res) => {
  try {
    const count = Math.min(req.body.count || 1000, 10000);
    const result = runMonteCarlo(count);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/simulations/rules — 取得規則常數
exports.getRules = (req, res) => {
  const { ATK_TABLE, OP_TABLE, FUND_TABLE, INITIAL } = require('../services/gameEngine');
  res.json({
    atkTable: ATK_TABLE,
    opTable: OP_TABLE,
    fundTable: FUND_TABLE,
    initial: INITIAL,
    roles: [
      { id: 'tsmc', name: '台積電', color: '#185FA5', goal: '保護技術主導權與商業利益' },
      { id: 'gov', name: '行政院', color: '#3B6D11', goal: '維持民意≥60%，降低攻台機率' },
      { id: 'us', name: '美國政府', color: '#993C1D', goal: '獲得技術轉移與資金' },
      { id: 'thinktank', name: '智庫', color: '#534AB7', goal: '維護公信力，條件全符才背書' },
    ],
  });
};
