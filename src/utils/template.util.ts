// src/utils/template.util.ts
import Handlebars from 'handlebars';
import { FileUtil } from './file.util';
import { TemplateError } from '../types';
import { NamingUtil } from './naming.util';

export class TemplateUtil {
  static registerHelpers(): void {
    // Register kebab-case helper
    Handlebars.registerHelper('kebabCase', (str: string) => NamingUtil.toKebabCase(str));
    
    // Register camelCase helper
    Handlebars.registerHelper('camelCase', (str: string) => NamingUtil.toCamelCase(str));
    
    // Register PascalCase helper
    Handlebars.registerHelper('pascalCase', (str: string) => NamingUtil.toPascalCase(str));
    
    // Register uppercase helper
    Handlebars.registerHelper('uppercase', (str: string) => str.toUpperCase());
    
    // Register lowercase helper
    Handlebars.registerHelper('lowercase', (str: string) => str.toLowerCase());
    
    // Register JSON parsing helper
    Handlebars.registerHelper('parseJSON', (str: string) => {
      try {
        return JSON.parse(str);
      } catch {
        return {};
      }
    });
    
    // Register conditional helper
    Handlebars.registerHelper('eq', (a: any, b: any) => a === b);
    Handlebars.registerHelper('ne', (a: any, b: any) => a !== b);
    Handlebars.registerHelper('gt', (a: any, b: any) => a > b);
    Handlebars.registerHelper('lt', (a: any, b: any) => a < b);
    
    // Register array/string helpers
    Handlebars.registerHelper('includes', (array: any[], item: any) => array?.includes(item));
    Handlebars.registerHelper('join', (array: any[], separator: string) => array?.join(separator));
    
    // Register method color helper for constants
    Handlebars.registerHelper('methodComment', (method: string) => {
      switch (method.toUpperCase()) {
        case 'GET': return '// 🔍 Retrieve';
        case 'POST': return '// ➕ Create';
        case 'PUT': return '// 📝 Update';
        case 'PATCH': return '// ✏️ Modify';
        case 'DELETE': return '// 🗑️ Remove';
        default: return '//';
      }
    });
  }

  static async compileTemplate(templatePath: string, context: any): Promise<string> {
    try {
      const templateContent = await FileUtil.readJsonFile<string>(templatePath);
      const template = Handlebars.compile(templateContent);
      return template(context);
    } catch (error) {
      throw new TemplateError(`Failed to compile template: ${templatePath}`, error);
    }
  }

  static compileTemplateString(templateString: string, context: any): string {
    try {
      const template = Handlebars.compile(templateString);
      return template(context);
    } catch (error) {
      throw new TemplateError('Failed to compile template string', error);
    }
  }
}

// Initialize template helpers
TemplateUtil.registerHelpers();