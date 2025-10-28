'use client';

import { toast as sonnerToast } from 'sonner';
import { AlertToast, type ToastProps } from '@/components/agent-ui/livekit/alert-toast';

type ToastPayload = Omit<ToastProps, 'id'>;

export function toastAlert(toast: ToastPayload) {
  return sonnerToast.custom(
    (id) => <AlertToast id={id} title={toast.title} description={toast.description} />,
    { duration: 10_000 }
  );
}
