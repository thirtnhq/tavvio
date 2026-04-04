interface MerchantBrandingProps {
  merchantName: string;
  merchantLogo?: string;
}

export function MerchantBranding({
  merchantName,
  merchantLogo,
}: MerchantBrandingProps) {
  return (
    <div className="text-center">
      {merchantLogo ? (
        <img
          src={merchantLogo}
          alt={merchantName}
          className="mx-auto h-10 w-10 rounded-lg object-cover"
        />
      ) : (
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground">
          {(merchantName?.charAt(0) || "T").toUpperCase()}
        </div>
      )}
      <p className="mt-2 text-sm font-medium text-foreground">
        {merchantName || "Useroutr"}
      </p>
    </div>
  );
}
