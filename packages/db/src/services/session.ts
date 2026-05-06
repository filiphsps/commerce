import type { SessionBase } from '../models';
import { SessionModel } from '../models';
import { Service } from './service';

export const Session = new Service<SessionBase, typeof SessionModel>(SessionModel);
