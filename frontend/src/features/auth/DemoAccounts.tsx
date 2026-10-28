import * as Dialog from '@radix-ui/react-dialog';
import {
  LayoutDashboard,
  ShoppingBag,
  Store,
  ArrowRight,
  UsersRound,
  X,
} from 'lucide-react';
import type { LoginFormValues } from './LoginForm';
const accounts = [
  {
    name: 'Pelanggan',
    email: 'demo@bagdaily.com',
    description: 'Belanja koleksi & pantau pesanan',
    icon: ShoppingBag,
  },
  {
    name: 'Admin',
    email: 'admin@bagdaily.com',
    description: 'Kelola produk, stok & laporan',
    icon: LayoutDashboard,
  },
  {
    name: 'Kasir',
    email: 'kasir@bagdaily.com',
    description: 'Layani transaksi & cetak struk',
    icon: Store,
  },
];
export function DemoAccounts({
  onChoose,
  disabled,
}: {
  onChoose: (values: LoginFormValues) => Promise<void>;
  disabled: boolean;
}) {
  return (
    <Dialog.Root>
      <div className="demo-accounts">
        <Dialog.Trigger asChild>
          <button type="button" className="demo-disclosure">
            <span className="flex items-center gap-2">
              <UsersRound size={17} />
              Demo Akun
            </span>
            <ArrowRight size={17} />
          </button>
        </Dialog.Trigger>
      </div>
      <Dialog.Portal>
        <Dialog.Overlay className="demo-dialog-overlay" />
        <Dialog.Content className="dialog-content demo-dialog">
          <div className="demo-dialog-title">
            <span>
              <UsersRound size={24} strokeWidth={1.6} />
            </span>
            <div>
              <Dialog.Title>Demo Akun</Dialog.Title>
              <Dialog.Description>
                Pilih peran dan langsung jelajahi BagDaily.
              </Dialog.Description>
            </div>
          </div>
          <div className="demo-account-list">
            {accounts.map(({ name, email, description, icon: Icon }) => (
              <button
                type="button"
                key={name}
                disabled={disabled}
                aria-label={`Masuk demo ${name}`}
                onClick={() => void onChoose({ email, password: 'BagDaily123!' })}
              >
                <span className="demo-icon">
                  <Icon size={21} strokeWidth={1.6} />
                </span>
                <span>
                  <strong>{name}</strong>
                  <span>{description}</span>
                  <small>{email}</small>
                </span>
                <ArrowRight size={17} />
              </button>
            ))}
          </div>
          <p className="demo-password">
            Password semua akun: <strong>BagDaily123!</strong>
          </p>
          <Dialog.Close className="dialog-close" aria-label="Tutup demo akun">
            <X size={20} />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
