'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
export default function ProductsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard/commercial?tab=product'); }, [router]);
  return null;
}
