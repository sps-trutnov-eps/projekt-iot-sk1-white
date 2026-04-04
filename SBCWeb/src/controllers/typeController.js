const TypeService = require('../services/TypeService');


const createType = (req,res) =>{
    try {
        const typeName = String(req.body.type);
        console.log('Controller.createType input:', typeName);

        const newType = TypeService.createType({ type: typeName });
        res.json({
            success: true,
            message: "MCU type created successfully.",
            data: newType
        });
    } catch (error) {
        return res.status(400).json({ message: req.t(error.message, { defaultValue: error.message }) });
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
            message: "Type deleted successfully."
        });
    } catch (error) {
        console.log(error);
        res.status(404).json({ 
            success: false,
            message: "Failed to delete type."
        });
    }
}


module.exports = {createType, getAllTypes, deleteType};