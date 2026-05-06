export enum ControlStatus {
  NOT_IMPLEMENTED = 'Not Implemented',
  PARTIALLY_IMPLEMENTED = 'Partially Implemented',
  IMPLEMENTED = 'Implemented',
  TESTED = 'Tested'
}

export enum ControlEffectiveness {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High'
}

export interface Control {
  id: string;
  riskId: string;
  title: string;
  description: string;
  status: ControlStatus;
  effectiveness: ControlEffectiveness;
  owner: string;
}
