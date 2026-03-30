"use client";

import { useState, useEffect } from "react";
import { Timer } from "@phosphor-icons/react";

interface QuoteCountdownProps {
  expiresAt?: string;
  onExpired?: () => void;
}

export function QuoteCountdown({ expiresAt, onExpired }: QuoteCountdownProps) {
  const [timeLeft, setTimeLeft] = useState(30);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (expiresAt) {
      const expiryTime = new Date(expiresAt).getTime();
      const now = Date.now();
      const initialTimeLeft = Math.max(0, Math.floor((expiryTime - now) / 1000));
      setTimeLeft(initialTimeLeft);
      setIsExpired(initialTimeLeft <= 0);
    }
  }, [expiresAt]);

  useEffect(() => {
    if (timeLeft <= 0) {
      setIsExpired(true);
      onExpired?.();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsExpired(true);
          onExpired?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onExpired]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timeLeft <= 5) return "text-destructive";
    if (timeLeft <= 10) return "text-amber-600";
    return "text-amber-500";
  };

  const getBorderColor = () => {
    if (timeLeft <= 5) return "border-destructive/30";
    if (timeLeft <= 10) return "border-amber/30";
    return "border-amber/30";
  };

  const getBgColor = () => {
    if (timeLeft <= 5) return "bg-destructive/5";
    if (timeLeft <= 10) return "bg-amber/5";
    return "bg-amber/5";
  };

  return (
    <div className={`flex items-center justify-between rounded-lg border ${getBorderColor()} ${getBgColor()} px-4 py-2.5`}>
      <div className="flex items-center gap-2">
        <Timer size={18} className={getTimerColor()} />
        <span className="text-sm font-medium text-foreground">
          {isExpired ? "Quote expired" : "Quote expires in"}
        </span>
      </div>
      <span className={`font-mono text-sm font-semibold ${getTimerColor()}`}>
        {isExpired ? "0:00" : formatTime(timeLeft)}
      </span>
    </div>
  );
}
