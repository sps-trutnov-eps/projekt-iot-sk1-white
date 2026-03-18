// services/templateService.js
const fs = require('fs');
const path = require('path');

const TEMPLATES_DIR = path.join(__dirname, '..', '..', 'data', 'templates');

class TemplateService {
    /**
     * Zajistí existenci adresáře pro šablony
     */
    static ensureDir() {
        if (!fs.existsSync(TEMPLATES_DIR)) {
            fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
        }
    }

    /**
     * Vrátí seznam dostupných šablon
     */
    static listTemplates() {
        this.ensureDir();
        return fs.readdirSync(TEMPLATES_DIR)
            .filter(f => f.endsWith('.py'))
            .map(f => ({
                name: f.replace('.py', ''),
                filename: f,
                size: fs.statSync(path.join(TEMPLATES_DIR, f)).size,
                modified: fs.statSync(path.join(TEMPLATES_DIR, f)).mtime
            }));
    }

    /**
     * Uloží novou šablonu (upload)
     */
    static saveTemplate(filename, content) {
        this.ensureDir();
        if (!filename.endsWith('.py')) filename += '.py';
        // Sanitize filename
        filename = filename.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
        const filePath = path.join(TEMPLATES_DIR, filename);
        fs.writeFileSync(filePath, content, 'utf-8');
        return filename;
    }

    /**
     * Načte obsah šablony
     */
    static getTemplate(filename) {
        const filePath = path.join(TEMPLATES_DIR, filename);
        if (!fs.existsSync(filePath)) {
            throw new Error(`Šablona "${filename}" nebyla nalezena.`);
        }
        return fs.readFileSync(filePath, 'utf-8');
    }

    /**
     * Smaže šablonu
     */
    static deleteTemplate(filename) {
        const filePath = path.join(TEMPLATES_DIR, filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return true;
        }
        return false;
    }

    /**
     * Renderuje šablonu — nahradí {{PLACEHOLDER}} hodnotami z config objektu
     */
    static render(templateContent, config) {
        return templateContent.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return config.hasOwnProperty(key) ? config[key] : match;
        });
    }

    /**
     * Vrátí seznam placeholderů nalezených v šabloně
     */
    static getPlaceholders(templateContent) {
        const matches = templateContent.matchAll(/\{\{(\w+)\}\}/g);
        return [...new Set([...matches].map(m => m[1]))];
    }
}

module.exports = TemplateService;
