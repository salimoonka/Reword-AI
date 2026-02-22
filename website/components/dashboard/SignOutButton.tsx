'use client';

import Button from '../ui/Button';
import { useRouter } from 'next/navigation';

export default function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    await fetch('/auth/sign-out', { method: 'POST' });
    router.push('/');
    router.refresh();
  };

  return (
    <Button variant="ghost" onClick={handleSignOut} className="w-full text-text-tertiary">
      Выйти из аккаунта
    </Button>
  );
}
