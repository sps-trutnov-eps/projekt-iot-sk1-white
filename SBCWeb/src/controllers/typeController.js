const TypeService = require('../models/Type/TypeService');


const createType = (req,res) =>{
    try {
        const data = req.body
        const newType = TypeService.createType(data.name);
        res.json({
            message: "Nový typ MCU byl úspěšně vytvořen.",
            data: newType
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

module.exports = {createType};