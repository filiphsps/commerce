import { UserModel } from '../models';
import { Service } from './service';

import type { UserBase } from '../models';

export const User = new Service<UserBase, typeof UserModel>(UserModel);
