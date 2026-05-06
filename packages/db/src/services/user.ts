import type { UserBase } from '../models';
import { UserModel } from '../models';
import { Service } from './service';

export const User = new Service<UserBase, typeof UserModel>(UserModel);
