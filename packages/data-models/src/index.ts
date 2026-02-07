export { workspaceSchema, getWorkspaceModel, Workspace, type WorkspaceDocument } from './schemas/workspace';
export { clientSchema, getClientModel, Client, type ClientDocument } from './schemas/client';
export { connectionSchema, getConnectionModel, Connection, type ConnectionDocument, type ConnectionType, type ConnectionStatus } from './schemas/connection';
export { userSchema, getUserModel, User, type UserDocument } from './schemas/user';
export { sessionSchema, getSessionModel, Session, type SessionDocument } from './schemas/session';
export { notificationSchema, getNotificationModel, Notification, type NotificationDocument, type NotificationChannel, type NotificationStatus } from './schemas/notification';
export { contactSchema, getContactModel, Contact, type ContactDocument, type ContactRole, type ContactStatus } from './schemas/contact';
export { jsonataTransformSchema, getJsonataTransformModel, JsonataTransform, type JsonataTransformDocument, type JsonataTransformStatus } from './schemas/jsonata-transform';
export { pipelineSchema, getPipelineModel, Pipeline, type PipelineDocument, type PipelineStatus } from './schemas/pipeline';

import type { Connection as MongooseConnection } from 'mongoose';
import { getWorkspaceModel } from './schemas/workspace';
import { getClientModel } from './schemas/client';
import { getConnectionModel } from './schemas/connection';
import { getUserModel } from './schemas/user';
import { getSessionModel } from './schemas/session';
import { getNotificationModel } from './schemas/notification';
import { getContactModel } from './schemas/contact';
import { getJsonataTransformModel } from './schemas/jsonata-transform';
import { getPipelineModel } from './schemas/pipeline';

export const makeModels = (conn: MongooseConnection) => ({
  Workspace: getWorkspaceModel(conn),
  Client: getClientModel(conn),
  Connection: getConnectionModel(conn),
  User: getUserModel(conn),
  Session: getSessionModel(conn),
  Notification: getNotificationModel(conn),
  Contact: getContactModel(conn),
  JsonataTransform: getJsonataTransformModel(conn),
  Pipeline: getPipelineModel(conn)
});

export type Models = {
  Workspace: ReturnType<typeof getWorkspaceModel>;
  Client: ReturnType<typeof getClientModel>;
  Connection: ReturnType<typeof getConnectionModel>;
  User: ReturnType<typeof getUserModel>;
  Session: ReturnType<typeof getSessionModel>;
  Notification: ReturnType<typeof getNotificationModel>;
  Contact: ReturnType<typeof getContactModel>;
  JsonataTransform: ReturnType<typeof getJsonataTransformModel>;
  Pipeline: ReturnType<typeof getPipelineModel>;
};
