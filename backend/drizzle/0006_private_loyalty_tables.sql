-- Loyalty is served through authenticated Express routes, never direct anonymous REST.
ALTER TABLE public.loyalty_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_ledger ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.loyalty_accounts, public.loyalty_ledger FROM public;
DO $block$
BEGIN
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
    REVOKE ALL ON public.loyalty_accounts, public.loyalty_ledger FROM anon;
  END IF;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
    REVOKE ALL ON public.loyalty_accounts, public.loyalty_ledger FROM authenticated;
  END IF;
END;
$block$;
