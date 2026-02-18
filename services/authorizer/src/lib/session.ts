import { createHash, scryptSync, timingSafeEqual, randomBytes } from 'crypto';
import {
  AuthorizerCore,
  AuthorizerCoreDependencies,
  ClientMeta,
  ClientTokenInput,
  ClientTokenResult,
  RefreshSessionInput,
  RefreshSessionResult,
  UserSessionInput,
  UserSessionResult,
  RegisterUserInput,
  RegisterUserResult
} from './types.js';
import {
  ClientNotFoundError,
  ClientSecretMismatchError,
  InvalidInputError,
  MissingJwtSecretError,
  ScopeNotAllowedError,
  SessionNotFoundError,
  UserNotFoundError,
  UserPasswordMismatchError,
  WorkspaceNotFoundError
} from './errors.js';

const WORKSPACE_CODE_LENGTH = 4;
const WORKSPACE_CODE_ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
const WORKSPACE_CODE_MAX_RETRIES = 10;

export function createAuthorizerCore(deps: AuthorizerCoreDependencies): AuthorizerCore {
  const uuid = deps.uuid ?? randomUuid;
  const now = deps.now ?? (() => new Date());
  const ttlMinutes = Number(deps.sessionTtlMinutes);
  const requireUserWorkspace = deps.requireUserWorkspace ?? false;
  if (!Number.isFinite(ttlMinutes) || ttlMinutes <= 0) {
    throw new InvalidInputError('sessionTtlMinutes must be a positive number');
  }

  async function ensureWorkspace(workspaceId: string) {
    const connection = await deps.getMasterConnection();
    const { Workspace } = deps.makeModels(connection);
    const workspace = await Workspace.findOne({ _id: workspaceId, status: 'active' }).lean().exec();
    if (!workspace) {
      throw new WorkspaceNotFoundError(workspaceId);
    }
    return { connection, workspace };
  }

  function pickScopes(requested: string[] | undefined, allowed: string[]): string[] {
    if (!allowed?.length) return [];
    if (!requested || requested.length === 0) return allowed;
    const allowedSet = new Set(allowed);
    const selected = requested.filter((s) => allowedSet.has(s));
    if (selected.length !== requested.length) {
      throw new ScopeNotAllowedError();
    }
    return selected;
  }

  function verifySecret(provided: string, hash: string, salt?: string | null): boolean {
    const derived = salt ? scryptSync(provided, salt, 64).toString('hex') : createHash('sha256').update(provided).digest('hex');
    const a = Buffer.from(derived);
    const b = Buffer.from(hash);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  function hashSecret(secret: string): { hash: string; salt: string } {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(secret, salt, 64).toString('hex');
    return { hash, salt };
  }

  async function issueClientToken(input: ClientTokenInput): Promise<ClientTokenResult> {
    if (!input.clientId) throw new InvalidInputError('clientId is required');
    if (!input.clientSecret) throw new InvalidInputError('clientSecret is required');
    if (!input.workspaceId) throw new InvalidInputError('workspaceId is required');

    const { connection } = await ensureWorkspace(input.workspaceId);
    const { Client, Session } = deps.makeModels(connection);

    const client = await Client.findOne({ _id: input.clientId, workspaceId: input.workspaceId, status: 'active' }).lean().exec();
    if (!client) throw new ClientNotFoundError(input.clientId);

    if (!client.secretHash) {
      throw new ClientSecretMismatchError();
    }

    const secretOk = verifySecret(input.clientSecret, String((client as any).secretHash), (client as any).secretSalt);
    if (!secretOk) throw new ClientSecretMismatchError();

    const scopes = pickScopes(input.scopes, (client as any).allowedScopes || []);
    const topics = Array.isArray((client as any).allowedTopics) ? (client as any).allowedTopics : [];

    if (typeof Session.init === 'function') {
      await Session.init();
    }

    const issuedAt = now();
    const expiresAt = new Date(issuedAt.getTime() + ttlMinutes * 60 * 1000);
    const sessionId = uuid();
    const context = buildSessionContext(input.clientMeta);

    await Session.create({
      _id: sessionId,
      workspaceId: input.workspaceId,
      principalId: input.clientId,
      principalType: 'client',
      scopes,
      topics,
      status: 'active',
      context,
      createdAt: issuedAt,
      updatedAt: issuedAt,
      expiresAt
    });

    const secondsUntilExpiry = Math.max(1, Math.floor((expiresAt.getTime() - issuedAt.getTime()) / 1000));
    const { token, exp } = await deps.signJwt({
      sessionId,
      principalId: input.clientId,
      principalType: 'client',
      workspaceId: input.workspaceId,
      scopes,
      topics,
      expiresInSec: secondsUntilExpiry
    });
    const nowSeconds = Math.floor(issuedAt.getTime() / 1000);

    return {
      sessionId,
      token,
      expiresIn: Math.max(0, exp - nowSeconds),
      expiresAt,
      clientId: input.clientId,
      workspaceId: input.workspaceId,
      scopes
    };
  }

  async function createUserSession(input: UserSessionInput): Promise<UserSessionResult> {
    if (!input.username) throw new InvalidInputError('username is required');
    if (!input.password) throw new InvalidInputError('password is required');
    if (requireUserWorkspace && !input.workspaceId) throw new InvalidInputError('workspaceId is required');

    const connection = await deps.getMasterConnection();
    const { User, Session } = deps.makeModels(connection);

    let workspaceIdToUse: string | undefined = input.workspaceId;

    if (requireUserWorkspace) {
      await ensureWorkspace(input.workspaceId!);
    }

    const userQuery: Record<string, unknown> = { username: input.username, status: 'active' };
    if (workspaceIdToUse) {
      userQuery.workspaceId = workspaceIdToUse;
    }

    const user = await User.findOne(userQuery).lean().exec();
    if (!user) throw new UserNotFoundError(input.username);

    if (!workspaceIdToUse && user.workspaceId) {
      workspaceIdToUse = String((user as any).workspaceId);
    }

    const passwordHash = (user as any).passwordHash as string | undefined | null;
    const passwordSalt = (user as any).passwordSalt as string | undefined | null;
    if (!passwordHash) throw new UserPasswordMismatchError();
    const passwordOk = verifySecret(input.password, passwordHash, passwordSalt);
    if (!passwordOk) throw new UserPasswordMismatchError();

    const roles = Array.isArray((user as any).roles) ? (user as any).roles : [];
    const scopes = ['ui:session', 'api:*'];

    if (typeof Session.init === 'function') {
      await Session.init();
    }

    const issuedAt = now();
    const expiresAt = new Date(issuedAt.getTime() + ttlMinutes * 60 * 1000);
    const sessionId = uuid();
    const context = buildSessionContext(input.clientMeta);

    await Session.create({
      _id: sessionId,
      workspaceId: workspaceIdToUse,
      principalId: String((user as any)._id ?? input.username),
      principalType: 'user',
      scopes,
      topics: [],
      status: 'active',
      context,
      createdAt: issuedAt,
      updatedAt: issuedAt,
      expiresAt
    });

    const secondsUntilExpiry = Math.max(1, Math.floor((expiresAt.getTime() - issuedAt.getTime()) / 1000));
    const { token, exp } = await deps.signJwt({
      sessionId,
      principalId: String((user as any)._id ?? input.username),
      principalType: 'user',
      workspaceId: workspaceIdToUse,
      scopes,
      topics: [],
      expiresInSec: secondsUntilExpiry
    });
    const nowSeconds = Math.floor(issuedAt.getTime() / 1000);

    return {
      sessionId,
      token,
      expiresIn: Math.max(0, exp - nowSeconds),
      expiresAt,
      user: {
        id: String((user as any)._id ?? input.username),
        roles,
        workspaceId: workspaceIdToUse
      }
    };
  }

  async function refreshSession(input: RefreshSessionInput): Promise<RefreshSessionResult> {
    if (!input.sessionId) {
      throw new InvalidInputError('sessionId is required');
    }

    const connection = await deps.getMasterConnection();
    const { Session } = deps.makeModels(connection);

    const session = await Session.findById(input.sessionId).exec();
    if (!session) {
      throw new SessionNotFoundError(input.sessionId);
    }

    if ((session as any).status && (session as any).status !== 'active') {
      throw new SessionNotFoundError(input.sessionId);
    }

    const sessionWorkspaceId = (session as any).workspaceId ? String((session as any).workspaceId) : undefined;
    if (input.workspaceId && sessionWorkspaceId && sessionWorkspaceId !== input.workspaceId) {
      throw new SessionNotFoundError(input.sessionId);
    }

    const nowDate = now();
    const currentExpiry = (session as any).expiresAt as Date | undefined;
    if (currentExpiry && currentExpiry.getTime() <= nowDate.getTime()) {
      throw new SessionNotFoundError(input.sessionId);
    }

    const expiresAt = new Date(nowDate.getTime() + ttlMinutes * 60 * 1000);
    (session as any).expiresAt = expiresAt;
    (session as any).updatedAt = nowDate;
    await session.save();

    const scopes = Array.isArray((session as any).scopes) ? (session as any).scopes : [];
    const topics = Array.isArray((session as any).topics) ? (session as any).topics : [];

    const secondsUntilExpiry = Math.max(1, Math.floor((expiresAt.getTime() - nowDate.getTime()) / 1000));
    const { token, exp } = await deps.signJwt({
      sessionId: input.sessionId,
      principalId: String((session as any).principalId),
      principalType: (session as any).principalType === 'user' ? 'user' : 'client',
       workspaceId: sessionWorkspaceId,
       scopes,
       topics,
       expiresInSec: secondsUntilExpiry
     });
    const nowSeconds = Math.floor(nowDate.getTime() / 1000);

    return {
      sessionId: input.sessionId,
      token,
      expiresIn: Math.max(0, exp - nowSeconds),
      expiresAt,
       principal: {
         id: String((session as any).principalId),
         type: (session as any).principalType === 'user' ? 'user' : 'client',
         workspaceId: sessionWorkspaceId,
         scopes
       }
     };
   }

  async function registerUser(input: RegisterUserInput): Promise<RegisterUserResult> {
    if (!input.username) throw new InvalidInputError('username is required');
    if (!input.password) throw new InvalidInputError('password is required');

    const connection = await deps.getMasterConnection();
    const { Workspace, User, Session } = deps.makeModels(connection);

    // Check if user exists (by username)
    const existingUser = await User.findOne({ username: input.username }).lean().exec();
    if (existingUser) {
      throw new InvalidInputError('User already exists');
    }

    const workspaceId = uuid();
    const userId = uuid();

    // Create Workspace with a unique 4-letter code.
    let workspaceCreated = false;
    for (let attempt = 0; attempt < WORKSPACE_CODE_MAX_RETRIES; attempt++) {
      const code = generateWorkspaceCode();
      try {
        await Workspace.create({
          _id: workspaceId,
          name: `${input.username}'s Workspace`,
          code,
          status: 'active',
          allowedOrigins: []
        });
        workspaceCreated = true;
        break;
      } catch (err) {
        if (isDuplicateWorkspaceCodeError(err)) continue;
        throw err;
      }
    }

    if (!workspaceCreated) {
      throw new InvalidInputError('Failed to allocate workspace code');
    }

    // Create User
    const { hash, salt } = hashSecret(input.password);
    await User.create({
      _id: userId,
      workspaceId,
      username: input.username,
      passwordHash: hash,
      passwordSalt: salt,
      roles: ['owner'],
      status: 'active'
    });

    const scopes = ['ui:session', 'api:*'];

    if (typeof Session.init === 'function') {
      await Session.init();
    }

    const issuedAt = now();
    const expiresAt = new Date(issuedAt.getTime() + ttlMinutes * 60 * 1000);
    const sessionId = uuid();
    const context = buildSessionContext(input.clientMeta);

    await Session.create({
      _id: sessionId,
      workspaceId,
      principalId: userId,
      principalType: 'user',
      scopes,
      topics: [],
      status: 'active',
      context,
      createdAt: issuedAt,
      updatedAt: issuedAt,
      expiresAt
    });

    const secondsUntilExpiry = Math.max(1, Math.floor((expiresAt.getTime() - issuedAt.getTime()) / 1000));
    const { token, exp } = await deps.signJwt({
      sessionId,
      principalId: userId,
      principalType: 'user',
      workspaceId,
      scopes,
      topics: [],
      expiresInSec: secondsUntilExpiry
    });
    const nowSeconds = Math.floor(issuedAt.getTime() / 1000);

    return {
      sessionId,
      token,
      expiresIn: Math.max(0, exp - nowSeconds),
      expiresAt,
      user: {
        id: userId,
        roles: ['owner'],
        workspaceId
      },
      workspaceId
    };
  }

  return {
    issueClientToken,
    createUserSession,
    refreshSession,
    registerUser
  };
}

function randomUuid(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const rand = Math.random() * 16 | 0;
    const value = char === 'x' ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}

function buildSessionContext(meta?: ClientMeta): Record<string, unknown> | undefined {
  if (!meta) return undefined;

  const context: Record<string, unknown> = {};
  const mappedEntries: Array<[keyof ClientMeta, string]> = [
    ['userAgent', 'user_agent'],
    ['chUa', 'ch_ua'],
    ['chUaPlatform', 'ch_ua_platform'],
    ['chUaMobile', 'ch_ua_mobile'],
    ['ip', 'ip_address']
  ];

  for (const [sourceKey, targetKey] of mappedEntries) {
    const raw = meta[sourceKey];
    if (raw === undefined || raw === null) continue;
    const value = String(raw).trim();
    if (!value) continue;
    context[targetKey] = value;
  }

  for (const [key, raw] of Object.entries(meta)) {
    if (mappedEntries.some(([sourceKey]) => sourceKey === key)) continue;
    if (raw === undefined || raw === null) continue;
    context[key] = raw;
  }

  return Object.keys(context).length ? context : undefined;
}

function generateWorkspaceCode(): string {
  const bytes = randomBytes(WORKSPACE_CODE_LENGTH);
  let code = '';
  for (const byte of bytes) {
    code += WORKSPACE_CODE_ALPHABET[byte % WORKSPACE_CODE_ALPHABET.length];
  }
  return code;
}

function isDuplicateWorkspaceCodeError(err: unknown): boolean {
  const error = err as any;
  if (error?.code !== 11000) return false;
  if (error?.keyPattern?.code === 1) return true;
  if (error?.keyValue && typeof error.keyValue === 'object' && 'code' in error.keyValue) return true;
  return false;
}
