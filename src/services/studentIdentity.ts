import type { StudentIdentity } from '../types';

/** Resolve database identity without ever substituting a sample profile for auth.uid(). */
export function resolveStudentIdentity(source: 'auth' | 'profiles', id: string): StudentIdentity {
  return source === 'auth' ? { type: 'real', id } : { type: 'demo', id };
}

export function studentProfileRoute(identity: StudentIdentity): `/student/${'real' | 'demo'}/${string}` {
  return `/student/${identity.type}/${identity.id}`;
}
