import { useApiQuery } from './useApiQuery';
import { useApiAction } from './useApiAction';
import { useUser } from '@/features/auth/useAuth';

export const useApi = useApiQuery;
export const useAction = useApiAction;
export { useUser };
