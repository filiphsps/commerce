import type { FeatureFlagBase } from '../models';
import { FeatureFlagModel } from '../models';
import { Service } from './service';

export class FeatureFlagService extends Service<FeatureFlagBase, typeof FeatureFlagModel> {
    public constructor() {
        super(FeatureFlagModel);
    }

    public async findByKey(key: string): Promise<FeatureFlagBase> {
        return (await this.find({ count: 1, filter: { key } })) as FeatureFlagBase;
    }
}

export const FeatureFlag = new FeatureFlagService();
