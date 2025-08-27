import fs from 'fs/promises';
import path from 'path';

export const processTemplate = async (templateName: string, data: Record<string, any>): Promise<string> => {
    try {
        const templatePath = path.join(process.cwd(), 'src/shared/templates/auth', `${templateName}.html`);
        let template = await fs.readFile(templatePath, 'utf-8');
        
        // Replace placeholders with data
        Object.keys(data).forEach(key => {
            const placeholder = `{{${key}}}`;
            template = template.replace(new RegExp(placeholder, 'g'), data[key]);
        });
        
        return template;
    } catch (error) {
        console.error('Error processing template:', error);
        throw new Error(`Failed to process template: ${templateName}`);
    }
};

export default processTemplate;
