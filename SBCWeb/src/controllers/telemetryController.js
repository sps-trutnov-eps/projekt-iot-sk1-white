let currentDataStorage = {};


const receiveData = (req,res) => {
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    
    if (!req.body || !req.body.device_id) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const {device_id, api_key, measurements} = req.body
    currentDataStorage[device_id] = {
    timestamp: new Date(),
    data: measurements
    };
    
    res.json({ status: 'success' });
};

const getData = (req, res) => {
  res.json(currentDataStorage);
};


const getTelemetryDebug = (req, res) => {
  res.render('telemetrydebug');
};

module.exports = {getData, getTelemetryDebug, receiveData};