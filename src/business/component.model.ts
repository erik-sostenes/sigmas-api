export interface AdministrativeUnitSummary {
  id: number;
  code: string;
  name: string;
}

export interface ComponentWithAdministrativeUnit {
  id: number;
  code: string;
  name: string;
  unit_administrative: AdministrativeUnitSummary;
}

