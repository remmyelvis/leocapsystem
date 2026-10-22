import { Link, useLocation } from "react-router-dom";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  width?: number | string;
  height?: number | string;
  /** Another image to show (for example the tight wordmark), instead of the padded square logo. */
  src?: string;
}

export default function BrandLogo({ size = "md", className = "", width, height, src = "/logo.png" }: BrandLogoProps) {
  const location = useLocation();

  let defaultHeightClass = "h-16";
  if (size === "sm") defaultHeightClass = "h-16";
  if (size === "lg") defaultHeightClass = "h-32";
  if (size === "xl") defaultHeightClass = "h-40";

  const customStyle = width || height ? { width, height } : undefined;

  let targetPath = "/";
  if (location.pathname.startsWith("/dashboard")) {
    targetPath = "/dashboard";
  } else if (location.pathname.startsWith("/hr")) {
    targetPath = "/hr/dashboard";
  } else if (location.pathname.startsWith("/finance")) {
    targetPath = "/finance/dashboard";
  } else if (location.pathname.startsWith("/admin")) {
    targetPath = "/admin/dashboard";
  }

  return (
    <Link to={targetPath} className="inline-block transition-opacity hover:opacity-90 active:opacity-80">
      <img
        src={src}
        alt="Leocap Invest"
        className={`${width || height ? "" : defaultHeightClass} object-contain ${className}`.trim()}
        style={customStyle}
      />
    </Link>
  );
}
