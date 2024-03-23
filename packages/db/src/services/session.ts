import { SessionModel } from '../models';

import { Service } from './service';

import type { SessionBase } from '../models';

export const Session = new Service<SessionBase, typeof SessionModel>(SessionModel);
