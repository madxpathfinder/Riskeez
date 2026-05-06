import { Control, ControlStatus, ControlEffectiveness } from '../types/control';
import { storageService } from './storageService';
import { auditLogService as auditService } from './auditLogService';
import { APP_CONFIG } from '../config/appConfig';
import { api } from './apiClient';

const CONTROLS_KEY = 'riskeez_controls';

export const controlService = {
  async getControls(): Promise<Control[]> {
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      const res = await api.get<{ controls: Control[] }>('/api/controls');
      return res.controls;
    }
    return storageService.getItem<Control[]>(CONTROLS_KEY) || [];
  },

  saveControls(controls: Control[]) {
    storageService.setItem(CONTROLS_KEY, controls);
  },

  async createControl(control: Omit<Control, 'id'>): Promise<Control> {
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      const res = await api.post<{ control: Control }>('/api/controls', control);
      return res.control;
    }
    const newControl: Control = {
      ...control,
      id: `c-${Date.now()}`
    };
    
    const controls = await this.getControls();
    controls.push(newControl);
    this.saveControls(controls);
    
    await auditService.log('control_created', 'Control', `Created control: ${newControl.title}`);
    
    return newControl;
  },

  async updateControl(control: Control): Promise<Control> {
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      const res = await api.put<{ control: Control }>(`/api/controls/${control.id}`, control);
      return res.control;
    }
    const controls = await this.getControls();
    const index = controls.findIndex(c => c.id === control.id);
    if (index !== -1) {
      controls[index] = control;
      this.saveControls(controls);
      await auditService.log('control_updated', 'Control', `Updated control: ${control.title}`);
    }
    
    return control;
  },

  async deleteControl(id: string): Promise<void> {
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      await api.delete(`/api/controls/${id}`);
      return;
    }
    let controls = await this.getControls();
    const control = controls.find(c => c.id === id);
    controls = controls.filter(c => c.id !== id);
    this.saveControls(controls);
    
    if (control) {
      await auditService.log('control_deleted', 'Control', `Deleted control: ${control.title}`);
    }
  }
};
