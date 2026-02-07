import mongoose, { Connection, Model, Document } from 'mongoose';

export type PipelineStatus = 'draft' | 'active' | 'paused' | 'failed';

export interface StreamDefinition {
  topic: string;
  type: 'source' | 'sink';
  description?: string;
}

export interface ClientConfigRef {
  clientId: string;
  role: 'source' | 'sink';
  connectorType?: 'S3' | 'HTTP';
  streamName?: string;
  description?: string;
}

export interface TransformConfig {
  type: 'jsonata';
  transformId: string;
}

export interface PipelineDocument extends Document<string> {
  _id: string;
  workspaceId: string;
  name: string;
  code: string;
  description?: string;
  status: PipelineStatus;
  streams: StreamDefinition[];
  sourceClients: ClientConfigRef[];
  sinkClients: ClientConfigRef[];
  transform?: TransformConfig;
  createdAt?: Date;
  updatedAt?: Date;
}

const streamDefinitionSchema = new mongoose.Schema({
  topic: { type: String, required: true, trim: true },
  type: { type: String, enum: ['source', 'sink'], required: true },
  description: { type: String }
}, { _id: false });

const clientConfigRefSchema = new mongoose.Schema({
  clientId: { type: String, required: true, trim: true },
  role: { type: String, enum: ['source', 'sink'], required: true },
  connectorType: { type: String, enum: ['S3', 'HTTP'] },
  streamName: { type: String, trim: true },
  description: { type: String }
}, { _id: false });

const transformConfigSchema = new mongoose.Schema({
  type: { type: String, enum: ['jsonata'], required: true },
  transformId: { type: String, required: true, trim: true }
}, { _id: false });

export const pipelineSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  workspaceId: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, length: 4 },
  description: { type: String, default: '' },
  status: { type: String, enum: ['draft', 'active', 'paused', 'failed'], default: 'draft', index: true },
  streams: { type: [streamDefinitionSchema], default: [] },
  sourceClients: { type: [clientConfigRefSchema], default: [] },
  sinkClients: { type: [clientConfigRefSchema], default: [] },
  transform: { type: transformConfigSchema, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

export function getPipelineModel(connection: Connection): Model<PipelineDocument> {
  return (connection.models.Pipeline as Model<PipelineDocument>) ||
    connection.model<PipelineDocument>('Pipeline', pipelineSchema);
}

export const Pipeline: Model<PipelineDocument> = (mongoose.models.Pipeline as Model<PipelineDocument>) ||
  mongoose.model<PipelineDocument>('Pipeline', pipelineSchema);
