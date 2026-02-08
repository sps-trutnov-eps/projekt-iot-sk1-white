const TypeRepository = require('./TypeRepository');

class TypeService{
    static createType(data){
        if(!data.name || data.name.trim() === ''){
            throw new Error('Jméno typu je povinné pole.');
        }


        const type = TypeRepository.create(data);
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





















