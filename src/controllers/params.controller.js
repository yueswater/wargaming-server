const { getParams, setParams, DEFAULT_PARAMS } = require('../models/params.model');

exports.get = async (req, res) => {
  try {
    const params = await getParams();
    res.json({ params, defaults: DEFAULT_PARAMS });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { params } = req.body;
    if (!params || typeof params !== 'object') {
      return res.status(400).json({ error: '缺少 params 欄位' });
    }
    const saved = await setParams(params, req.user?.username);
    res.json({ params: saved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
