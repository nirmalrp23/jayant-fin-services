import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/branding/jayant-logo.jpg"
      alt="Jayant Fin Services logo"
      width={640}
      height={640}
      priority={priority}
      unoptimized
      className={cn(
        "h-20 w-20 shrink-0 rounded-full bg-white object-contain",
        className,
      )}
    />
  );
}
