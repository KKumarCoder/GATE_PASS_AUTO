import mongoose from 'mongoose';
import {env,validateEnvironment} from '../config/env.js';
import '../models/index.js';
validateEnvironment();await mongoose.connect(env.mongo);
// Create declared indexes without dropping unknown indexes from a live database.
for(const model of Object.values(mongoose.models)){await model.createIndexes();console.log(`Indexes ready: ${model.modelName}`);}
await mongoose.disconnect();
