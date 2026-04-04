const { randomBytes } = require('crypto');
const MCU = require('../models/MCU');
const MCUService = require('../services/mcuService');

const generateApiKey = () => 'api_' + randomBytes(16).toString('hex');

const renderMCU = (req, res) =>{
  try{
    res.render('mcus', { projectName: 'IoT Control' });
  } catch (error) {
    res.status(400).json({ message: req.t(error.message, { defaultValue: error.message }) });
  }
}

const renderMCUDetail = async (req, res) => {
  try {
    const id = req.params.id;
    
    // Tady pozor: Pokud MCUService vrací Promise, musí tu být await
    // Pokud to teď hází chybu, zakomentuj tento řádek pro test:
    // const test = await MCUService.findById(id); 

    const mcuData = { // Zkusme to pojmenovat jasně
      id: id,
      name: "Obývák - ESP32",
      type: "ESP32 Dev Board",
      ip: "192.168.1.45",
      mac: "A0:B1:C2:D3:E4:F5",
      status: "offline", 
      uptime: "4d 12h 30m"
    };

    // Důležité: Jméno vlevo je to, co vidí EJS. Jméno vpravo je proměnná zde v JS.
    res.render('mcuDetail', { 
      projectName: 'IoT Control',
      mcu: mcuData 
    });

  } catch (error) {
    console.error("DETAIL ERROR:", error);
    // Pokud error.ejs používá partialy, které vyžadují 'mcu', spadne to i tady.
    // Pro test pošli prázdný objekt, aby EJS nehlásilo 'undefined'
    res.status(500).send(error.message); 
  }
};


const createMCU = (req, res) => {
  try {
    const newMCU = MCUService.createMCU(req.body);
    res.status(201).json({
        success: true,
        message: "MCU created successfully.",
        data: newMCU
    });
  } catch (error) {
    res.status(400).json({ message: req.t(error.message, { defaultValue: error.message }) });
  }
};

const getMCU = (req, res) => {
  try {
    const id = req.body.id; 
    if (!id) {
      return res.status(400).json({ success: false, message: "ID not provided." });
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
    res.status(400).json({ success: false, message: req.t(error.message, { defaultValue: error.message }) });
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
    res.status(400).json({ message: req.t(error.message, { defaultValue: error.message }) });
  }
}

const deleteMCU = (req, res) => {
  try {
    const id = req.body.id;
    if (!id) {
      return res.status(400).json({ message: "ID is required." });
    }
    const result = MCUService.deleteMCU(id);
    if (!result || result.changes === 0) {
      return res.status(404).json({ message: "MCU nenalezeno." });
    }
    res.json({ 
      success: true,
      message: "MCU deleted successfully." });
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
        return res.status(400).json({ success: false, message: "Missing ID for update." });
    }

    MCUService.updateMCU(id, MCUdata);
    res.json({
      success: true,
      message: "MCU updated successfully."
    })
  }
  catch(error){
    res.status(400).json({ message: req.t(error.message, { defaultValue: error.message }) });
  }

}

const updateApiKey = (req, res) => {
  try {
    const { id, apiKey } = req.body;
    if (!id) return res.status(400).json({ success: false, message: 'Missing ID.' });

    // Pokud přijde prázdný řetězec, vygenerujeme nový klíč
    const newKey = (apiKey && apiKey.trim()) ? apiKey.trim() : generateApiKey();

    const MCURepository = require('../repositories/MCURepository');
    const result = MCURepository.updateApiKey(id, newKey);
    if (!result || result.changes === 0) {
      return res.status(404).json({ success: false, message: 'MCU nenalezeno.' });
    }
    res.json({ success: true, message: 'API key updated.', apiKey: newKey });
  } catch (error) {
    res.status(500).json({ success: false, message: req.t(error.message, { defaultValue: error.message }) });
  }
};

module.exports = {createMCU, getMCU, getALLMCUs, deleteMCU, updateMCU, updateApiKey, renderMCU, renderMCUDetail};