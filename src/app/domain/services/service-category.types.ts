import { Service } from './service.entity';

export interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
  services: Service[];
}
