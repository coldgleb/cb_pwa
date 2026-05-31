"use client";

import { useToast } from "@/components/Toast";
import { useRef } from "react";

interface MerchantFormWrapperProps {
  action: (formData: FormData) => Promise<void>;
  successMessage: string;
  children: React.ReactNode;
  className?: string;
  id?: string;
  onSuccess?: () => void;
}

export default function MerchantFormWrapper({ 
  action, 
  successMessage, 
  children, 
  className,
  id,
  onSuccess 
}: MerchantFormWrapperProps) {
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (formData: FormData) => {
    try {
      await action(formData);
      toast(successMessage);
      if (onSuccess) {
        onSuccess();
      } else {
        // Default behavior for creation: clear the form
        if (!successMessage.includes("обновлены")) {
           formRef.current?.reset();
        }
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Произошла ошибка", "error");
    }
  };

  return (
    <form id={id} ref={formRef} action={handleSubmit} className={className}>
      {children}
    </form>
  );
}
