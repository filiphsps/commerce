import type { IdentityBase } from '../models';
import { IdentityModel } from '../models';
import { Service } from './service';

export const Identity = new Service<IdentityBase, typeof IdentityModel>(IdentityModel);
