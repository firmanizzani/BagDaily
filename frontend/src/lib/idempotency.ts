import { generateUUID } from '@/services/apiClient';

interface Operation {
  fingerprint: string;
  key: string;
}

const pendingOperations = new Map<string, Operation>();

export function operationKey(scope: string, payload: unknown): string {
  const fingerprint = JSON.stringify(payload);
  let previous = pendingOperations.get(scope);
  try {
    const saved = sessionStorage.getItem(`bagdaily_operation:${scope}`);
    if (saved) previous = JSON.parse(saved) as Operation;
  } catch {
    previous = pendingOperations.get(scope);
  }
  if (previous?.fingerprint === fingerprint) return previous.key;
  const operation = { fingerprint, key: generateUUID() };
  pendingOperations.set(scope, operation);
  try {
    sessionStorage.setItem(`bagdaily_operation:${scope}`, JSON.stringify(operation));
  } catch {
    return operation.key;
  }
  return operation.key;
}

export function completeOperation(scope: string): void {
  pendingOperations.delete(scope);
  try {
    sessionStorage.removeItem(`bagdaily_operation:${scope}`);
  } catch {
    return;
  }
}
