export interface ComponentSummary {
  id: number;
  code: string;
  name: string;
}

export interface ActivityItem {
  id: number;
  code: string;
  name: string;
  component: ComponentSummary;
}

