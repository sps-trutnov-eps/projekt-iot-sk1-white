const Type = require('../models/Type');
const TypeRepository = require('../repositories/TypeRepository');

class TypeService{
    static createType(data){
        
        if(!data.type || data.type.trim() === ''){
            throw new Error('Název typu je povinné pole.');  
        }
        
        if(TypeRepository.findByName(data.type)){
            throw new Error('Tento typ již existuje.');  
        }

        const type = new Type({
            type: data.type 
        });
        
        const dbData = type.toDatabase();

        const result = TypeRepository.create(dbData);
        // result může být objekt nebo číslo -> zjistit id podobně jako u MCUService
        const newId = result && (result.lastID || result.id || result) ;
        type.id = newId;

        return type;
    }

    static getType(id){
        if(!id){
            throw new Error('Id je nutné pro smazání controlleru.')
        }
        return TypeRepository.find(id);
    }

    static getAllTypes(){
        return TypeRepository.findAll();
    }

    static deleteType(id){
        if(!id){
            throw new Error('Id je nutné pro smazání controlleru.')
        }
        const type = TypeRepository.find(id);
        if(!type){
            throw new Error('Typ nebyl nalezen.')
        }
        return TypeRepository.delete(id);
    }

}


module.exports = TypeService;


















