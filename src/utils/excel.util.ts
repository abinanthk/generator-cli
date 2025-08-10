// src/utils/excel.util.ts
import * as XLSX from 'xlsx';
import { ApiDocumentation, ModelDocumentation, FileOperationError } from '../types';

export class ExcelUtil {
  static async readApisFromExcel(filePath: string): Promise<ApiDocumentation[]> {
    try {
      const workbook = XLSX.readFile(filePath);
      const worksheet = workbook.Sheets['APIs'];
      
      if (!worksheet) {
        throw new Error('APIs worksheet not found');
      }

      const data: any = XLSX.utils.sheet_to_json(worksheet) as any[];
      return data.map((row: any) => ({
        sNo: Number(row.sNo),
        endpoint: String(row.endpoint),
        method: String(row.method),
        tag: String(row.tag),
        operationId: String(row.operationId),
        summary: String(row.summary),
        pathParams: row.pathParams ? String(row.pathParams) : undefined,
        queryParamsRef: row.queryParamsRef ? String(row.queryParamsRef) : undefined,
        requestBodyRef: row.requestBodyRef ? String(row.requestBodyRef) : undefined,
        responseBodyRef: row.responseBodyRef ? String(row.responseBodyRef) : undefined,
        isPaginated: Boolean(row.isPaginated),
        requiresAuth: Boolean(row.requiresAuth),
        businessPurpose: row.businessPurpose ? String(row.businessPurpose) : undefined,
      }));
    } catch (error) {
      throw new FileOperationError(`Failed to read APIs from Excel: ${filePath}`, error);
    }
  }

  static async readModelsFromExcel(filePath: string): Promise<ModelDocumentation[]> {
    try {
      const workbook = XLSX.readFile(filePath);
      const worksheet = workbook.Sheets['Models'];
      
      if (!worksheet) {
        throw new Error('Models worksheet not found');
      }

      const data = XLSX.utils.sheet_to_json(worksheet) as any[];
      return data.map(row => ({
        sNo: Number(row.sNo),
        modelName: String(row.modelName),
        properties: String(row.properties),
        required: row.required ? String(row.required) : undefined,
        description: row.description ? String(row.description) : undefined,
        usedInOperations: row.usedInOperations ? String(row.usedInOperations) : undefined,
      }));
    } catch (error) {
      throw new FileOperationError(`Failed to read Models from Excel: ${filePath}`, error);
    }
  }
}
