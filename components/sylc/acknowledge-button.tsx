"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { api, ApiClientError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

type AcknowledgeButtonProps = {
  disabled?: boolean;
  onSuccess?: (result: { checkedAt: string }) => void;
  className?: string;
  size?: "default" | "sm" | "lg";
  variant?: "default" | "outline" | "secondary";
};

export function AcknowledgeButton({
  disabled,
  onSuccess,
  className,
  size = "lg",
  variant = "default",
}: AcknowledgeButtonProps) {
  const [acknowledging, setAcknowledging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);

  async function handleAcknowledge() {
    setAcknowledging(true);
    setError(null);
    setConfirmedAt(null);
    try {
      const result = await api.acknowledgeSylc();
      setConfirmedAt(result.checkedAt);
      onSuccess?.(result);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to update baseline");
    } finally {
      setAcknowledging(false);
    }
  }

  return (
    <div className={className}>
      <Button
        onClick={handleAcknowledge}
        disabled={disabled || acknowledging}
        size={size}
        variant={variant}
        className="shadow-sm"
      >
        {acknowledging ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Updating baseline...
          </>
        ) : (
          <>
            <Check className="mr-2 h-4 w-4" />
            Mark all as checked
          </>
        )}
      </Button>
      {confirmedAt && (
        <p className="mt-2 max-w-xs text-xs leading-relaxed text-muted-foreground">
          <span className="font-medium text-[#00b386]">Baseline updated. </span>
          Your watchlist is now considered checked as of{" "}
          {formatDistanceToNow(new Date(confirmedAt), { addSuffix: true })}.
        </p>
      )}
      {error && (
        <Alert variant="destructive" className="mt-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
