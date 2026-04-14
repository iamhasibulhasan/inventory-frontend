'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
export default function PurchaseRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard/purchase-requisition'); }, [router]);
  return null;
}
