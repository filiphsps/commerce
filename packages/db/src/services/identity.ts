import { IdentityModel } from '../models';
import { Service } from './service';

import type { IdentityBase } from '../models';

export const Identity = new Service<IdentityBase, typeof IdentityModel>(IdentityModel);
