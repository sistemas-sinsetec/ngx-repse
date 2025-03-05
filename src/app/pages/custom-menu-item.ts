import { NbMenuItem } from '@nebular/theme';

export interface CustomMenuItem extends NbMenuItem {
  permission?: {
    section: string;
    subSection?: string | null;
  };
  requiredLevel?: string[]; // Cambia a un arreglo de strings
  children?: CustomMenuItem[]; // Redefine children para aceptar CustomMenuItem[]
}