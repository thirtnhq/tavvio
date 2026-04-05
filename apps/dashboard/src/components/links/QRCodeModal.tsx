"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
} from "@useroutr/ui";
import { Download } from "@phosphor-icons/react";
import { useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";

interface QRCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  linkName?: string;
}

export function QRCodeModal({ open, onOpenChange, url, linkName }: QRCodeModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      if (!svgRef.current) return;

      const svgData = new XMLSerializer().serializeToString(svgRef.current);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = 400;
        canvas.height = 400;

        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.drawImage(img, 0, 0, 400, 400);
        URL.revokeObjectURL(svgUrl);

        canvas.toBlob((blob) => {
          if (!blob) return;
          const downloadUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = downloadUrl;
          link.download = `${linkName?.replace(/\s+/g, "-") || "payment-link"}-qr.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(downloadUrl);
          setIsDownloading(false);
        }, "image/png");
      };
      img.src = svgUrl;
    } catch (error) {
      console.error("Failed to download QR code:", error);
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR Code</DialogTitle>
          {linkName && (
            <DialogDescription>Scan to pay: {linkName}</DialogDescription>
          )}
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-4">
          <div className="rounded-lg border border-[var(--border)] bg-card p-4 shadow-sm">
            <QRCodeSVG
              value={url}
              size={200}
              level="H"
              includeMargin={true}
              ref={svgRef}
            />
          </div>
          <p className="mt-4 text-center text-sm text-[var(--muted-foreground)]">
            Scan this QR code to access the payment link
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            type="button"
            onClick={handleDownload}
            loading={isDownloading}
          >
            <Download size={16} />
            Download PNG
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
