const TypeService = require('../models/Type/TypeService');


const createType = (req,res) =>{
    try {
        const typeName = (req.body.type);
        console.log('Controller.createType input:', typeName);

        if (!typeName || String(typeName).trim() === '') {
            return res.status(400).json({ success: false, message: 'Pole "type" je povinné' });
        }
        console.log('tady');
        const newType = TypeService.createType({ type: typeName });
        console.log('created type (to send):', newType);

        res.json({
            success: true,
            message: "Nový typ MCU byl úspěšně vytvořen.",
            data: newType
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getAllTypes = (req,res) =>{
    try {
        const types = TypeService.getAllTypes();
        res.json({
            data: types
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
}

module.exports = {createType, getAllTypes};