const MCU = require('../models/MCU/MCU');
const MCUService = require('../models/MCU/MCUService');

const renderMCU = (req, res) =>{
  try{
    res.render('mcus', { projectName: 'IoT Control' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}


const createMCU = (req, res) => {
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

const getMCU = (req, res) => {
  try {
    const id = req.body.id; 
    if (!id) {
      return res.status(400).json({ success: false, message: "ID nebylo zasláno" });
    }

    const mcu = MCUService.findById(id);
    if (!mcu) {
      return res.status(404).json({ success: false, message: "MCU nenalezeno" });
    }

    res.json({
      success: true,
      mcu: mcu
    });
  }
  catch(error) {
    res.status(400).json({ success: false, message: error.message });
  }
}


const getALLMCUs = (req,res) =>{
  try{
    const MCUs = MCUService.getAllMCUs();
    res.json({
      success: true,
      result: MCUs
    })
  }
  catch(error){
    res.status(400).json({ message: error.message });
  }
}

const deleteMCU = (req, res) => {
  try {
    const id = req.body.id;
    if (!id) {
      return res.status(400).json({ message: "Id je povinné k vyhledání." });
    }
    const result = MCUService.deleteMCU(id);
    if (!result || result.changes === 0) {
      return res.status(404).json({ message: "MCU nenalezeno." });
    }
    res.json({ 
      success: true,
      message: "MCU bylo úspěšně smazáno." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};


const updateMCU = (req,res) => {
  try{
    
    const MCUdata = req.body;
    const id =MCUdata.id;
    
    if (!id) {
        return res.status(400).json({ success: false, message: "Chybí ID pro aktualizaci." });
    }

    MCUService.updateMCU(id, MCUdata);
    res.json({
      success: true,
      message: "MCU bylo úspěšně upraveno."
    })
  }
  catch(error){
    res.status(400).json({ message: error.message });
  }

}

module.exports = {createMCU, getMCU, getALLMCUs, deleteMCU, updateMCU, renderMCU};