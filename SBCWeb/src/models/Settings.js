class Setting {
    constructor(data) {
        this.key = data.setting_key || data.key;
        this.value = data.setting_value || data.value;
        this.description = data.description || '';
        this.updatedAt = data.updated_at || data.updatedAt || new Date().toISOString();
    }
}
module.exports = Setting;