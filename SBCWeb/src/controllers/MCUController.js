const MCUService = require('../models/MCU/MCUService');

const addMCU = (req, res) => {
  try {
    const newMCU = MCUService.createMCU(req.body);
    res.status(201).json({
        message: "MCU bylo úspěšně vytvořeno",
        data: newMCU
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getMCU = (req,res) =>{
  try{
    const id = req.params.id;
    const MCU = MCUService.findById(id);
    res.json({
      mcu: MCU
    })
  }
  catch(error){
    res.status(400).json({ message: error.message });
  }
}

const getALLMCUs = (req,res) =>{
  try{
    const MCUs = MCUService.getAllMCUs();
    res.json({
      controllers: MCUs
    })
  }
  catch(error){
    res.status(400).json({ message: error.message });
  }
}

const deleteMCU = (req,res) => {
  try{
    const id = req.params.id
    MCUService.deleteMCU(id);
    res.json({
      message: "MCU bylo úspěšně smazáno."
    })
  }
  catch(error){
res.status(400).json({ message: error.message });
  }
}


const updateMCU = (req,res) => {
  try{
    const id = req.params.id
    const MCUdata = req.body
    MCUService.updateMCU(id, MCUdata);
    res.json({
      message: "MCU bylo úspěšně upraveno."
    })
  }
  catch(error){
    res.status(400).json({ message: error.message });
  }

}

module.exports = {addMCU, getMCU, getALLMCUs, deleteMCU, updateMCU};