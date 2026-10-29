import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useLogin, useUser } from '@/features/auth/useAuth';
import { loginDestination } from '@/features/auth/loginDestination';
import { DemoAccounts } from '@/features/auth/DemoAccounts';
import { LoginForm, type LoginFormValues } from '@/features/auth/LoginForm';
import { Link, Navigate } from 'react-router-dom';

export function LoginPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const login = useLogin();
  const { data: user } = useUser();

  const handleLogin = async (data: LoginFormValues, demo = false) => {
    try {
      const res = await login.mutateAsync(data);
      toast.success(`Selamat datang kembali, ${res.data.name}!`);
      const returnUrl = demo
        ? null
        : params.get('from') || location.state?.from?.pathname;
      navigate(loginDestination(res.data.role, returnUrl), { replace: true });
    } catch {
      return;
    }
  };

  if (user?.role === 'admin' || user?.role === 'kasir') {
    return <Navigate to={loginDestination(user.role)} replace />;
  }

  return (
    <div className="auth-page">
      <aside className="auth-story">
        <div>
          <h2>
            Setiap langkah,
            <br />
            cerita baru.
          </h2>
          <p>Temukan teman perjalananmu di BagDaily.</p>
        </div>
      </aside>
      <div className="auth-form">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-extrabold text-[#001524]">Masuk ke BagDaily</h1>
          <p className="text-xs text-[#6E7E8D] mt-1">
            Senang bertemu lagi. Masuk untuk melanjutkan.
          </p>
        </div>

        <LoginForm onSubmit={handleLogin} isLoading={login.isPending} />

        <div className="mt-6 border-t border-[#001524]/10 pt-4 text-center text-xs text-[#6E7E8D]">
          Belum punya akun?{' '}
          <Link to="/register" className="font-semibold text-[#15616D] hover:underline">
            Daftar Pelanggan Baru
          </Link>
        </div>
        <DemoAccounts
          onChoose={data => handleLogin(data, true)}
          disabled={login.isPending}
        />
      </div>
    </div>
  );
}
