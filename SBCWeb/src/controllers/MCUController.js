const MCUService = require('../models/MCU/MCUService');

const addMCU = (req, res) => {
  try {
    const newMCU = MCUService.createMCU(req.body);
    res.status(201).json({
        success: true,
        message: "MCU bylo úspěšně vytvořeno",
        data: newMCU
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


module.exports = {addMCU};