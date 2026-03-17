import { Injectable } from '@nestjs/common';

@Injectable()
export class VehiclesService {
  private vehicles = [];

  create(data: any) {
    const vehicle = { id: Date.now(), ...data };
    this.vehicles.push(vehicle);
    return vehicle;
  }

  findAll() {
    return this.vehicles;
  }
}
