import { Outlet } from 'react-router-dom';
import { StorefrontNavbar } from '@/components/storefront/StorefrontNavbar';
import { StorefrontFooter } from '@/components/storefront/StorefrontFooter';

export function StorefrontLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-[#FAF9F6] text-[#001524]">
      <StorefrontNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <StorefrontFooter />
    </div>
  );
}
