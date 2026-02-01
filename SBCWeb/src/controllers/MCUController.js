const MCUModel = require('../models/MCU/MCUmodel'); // ← CHYBÍ!

const addMCU = (req, res) => {
  try {
    const newDevice = MCUModel.create(req.body);
    res.status(201).json(newDevice);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


module.exports = { addMCU};