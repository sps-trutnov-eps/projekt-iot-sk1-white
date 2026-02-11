const TypeService = require('../models/Type/TypeService');


const createType = (req,res) =>{
    try {
        const typeName = String(req.body.type);
        console.log('Controller.createType input:', typeName);

        const newType = TypeService.createType({ type: typeName });
        res.json({
            success: true,
            message: "Nový typ MCU byl úspěšně vytvořen.",
            data: newType
        });
    } catch (error) {
        return res.status(400).json({message: error.message });
    }
};

const getAllTypes = (req,res) =>{
    try {
        const types = TypeService.getAllTypes();
        res.json({
            result: types
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
}

const deleteType = (req,res) =>{
    try {
        const id = req.body.id;
        TypeService.deleteType(id);
        res.status(200).json({ 
            success: true,
            message: "Typ byl úspěšně smazán.",
        });
    } catch (error) {
        console.log(error);
        res.status(404).json({ 
            message: error.message
        });
    }
}


module.exports = {createType, getAllTypes, deleteType};