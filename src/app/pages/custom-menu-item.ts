import { NbMenuItem } from '@nebular/theme';

export interface CustomMenuItem extends NbMenuItem {
  permission?: {
    section: string;
    subSection?: string | null;
  };
  children?: CustomMenuItem[]; // Redefine children para aceptar CustomMenuItem[]
}
