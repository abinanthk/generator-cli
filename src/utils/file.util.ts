// src/utils/file.util.ts
import { readFile, writeFile, ensureDir, pathExists } from 'fs-extra';
import { dirname } from 'path';
import { FileOperationError } from '../types';

export class FileUtil {
  static async ensureFileDir(filePath: string): Promise<void> {
    await ensureDir(dirname(filePath));
  }

  static async readJsonFile<T>(filePath: string): Promise<T> {
    try {
      const content = await readFile(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      throw new FileOperationError(`Failed to read JSON file: ${filePath}`, error);
    }
  }

  static async writeJsonFile(filePath: string, data: any): Promise<void> {
    try {
      await this.ensureFileDir(filePath);
      await writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      throw new FileOperationError(`Failed to write JSON file: ${filePath}`, error);
    }
  }

  static async writeTextFile(filePath: string, content: string): Promise<void> {
    try {
      await this.ensureFileDir(filePath);
      await writeFile(filePath, content, 'utf8');
    } catch (error) {
      throw new FileOperationError(`Failed to write text file: ${filePath}`, error);
    }
  }

  static async fileExists(filePath: string): Promise<boolean> {
    return pathExists(filePath);
  }
}
