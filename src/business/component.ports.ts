import { Component } from './component.model';

export abstract class ComponentLogicI {
  abstract getComponents(): Promise<Component[]>;
}

export abstract class ComponentRepositoryI {
  abstract findAll(): Promise<Component[]>;
  abstract exists(id: number): Promise<boolean>;
}
