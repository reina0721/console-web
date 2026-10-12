'use client';
import { useSearchParams } from 'next/navigation';
import { InboxPage } from '../../src/inbox-page';
export default function NotificationDetailRoute() {
  return <InboxPage id={useSearchParams().get('id') ?? ''} />;
}
