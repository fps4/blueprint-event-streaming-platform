import mongoose, { Connection as MongooseConnection, Model, Document } from 'mongoose';

export type ConnectionType = 'HTTP' | 'S3';
export type ConnectionStatus = 'active' | 'inactive';

export interface ConnectionDocument extends Document<string> {
  _id: string;
  name: string;
  type: ConnectionType;
  status: ConnectionStatus;
  config: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    bucket?: string;
    region?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  };
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export const connectionSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['HTTP', 'S3'], required: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  config: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
    validate: {
      validator: function(this: ConnectionDocument, config: any) {
        if (this.type === 'HTTP') {
          return config?.url && typeof config.url === 'string';
        }
        if (this.type === 'S3') {
          return config?.bucket && typeof config.bucket === 'string';
        }
        return true;
      },
      message: 'Invalid config for connection type'
    }
  },
  description: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export function getConnectionModel(connection: MongooseConnection): Model<ConnectionDocument> {
  return (connection.models.Connection as Model<ConnectionDocument>) ||
    connection.model<ConnectionDocument>('Connection', connectionSchema);
}

export const Connection: Model<ConnectionDocument> = (mongoose.models.Connection as Model<ConnectionDocument>) ||
  mongoose.model<ConnectionDocument>('Connection', connectionSchema);
