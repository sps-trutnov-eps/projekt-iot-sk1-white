const Type = require('./Type');
const TypeRepository = require('./TypeRepository');

class TypeService{
    static createType(data){

        if(!data.type || data.type.trim() === ''){
            console.log("error");
            throw new Error('Jméno typu je povinné pole.');
            
        }
        

        const type = new Type({
            type: data.type 
        });
        
        const dbData = type.toDatabase();

        const result = TypeRepository.create(dbData);
        console.log('bagr')
        // result může být objekt nebo číslo -> zjistit id podobně jako u MCUService
        const newId = result && (result.lastID || result.id || result) ;
        type.id = newId;

        return type;
    }

    static findById(data){
        if(!data.id){
            throw new Error('Id je povinné k vyhledání.');
        }

        const type = TypeRepository.findById(data.id);

        if(!type){
            throw new Error('Typ MCU nebyl nalezen.');
        }
        return type
    }


}


module.exports = TypeService;


















