import 'server-only';

import { MissingEnvironmentVariableError } from '@nordcom/commerce-errors';
import mongoose from 'mongoose';

mongoose.set('strictQuery', true);
mongoose.set('strict', 'throw');

export const db = async () => {
    if (global.mongoose) return global.mongoose;

    const uri = process.env.MONGODB_URI as string;
    if (!uri) throw new MissingEnvironmentVariableError('MONGODB_URI');

    global.mongoose = await mongoose.connect(uri, {
        bufferCommands: false
    });
    return global.mongoose;
};
