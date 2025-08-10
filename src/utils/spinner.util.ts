// src/utils/spinner.util.ts
import ora from 'ora';

export const createSpinner = (text: string) => ora({
  text,
  spinner: 'dots',
  color: 'cyan'
});