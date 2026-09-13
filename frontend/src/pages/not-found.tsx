import { Link } from "react-router-dom";
import { HomeIcon } from "lucide-react";
import BrandLogo from "@/components/global/BrandLogo";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 to-blue-800 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8 select-none">
          <BrandLogo height={40} />
        </div>

        {/* 404 display */}
        <div className="relative mb-6">
          <p className="text-[120px] font-black text-white/10 leading-none select-none">
            404
          </p>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-6xl font-black text-white">404</p>
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-black text-white mb-3">
          Page Not Found
        </h1>
        <p className="text-blue-200/80 text-sm leading-relaxed mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Let&apos;s get you back on track.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/"
            className="inline-flex items-center justify-center gap-2 bg-white text-blue-900 font-bold px-6 py-3 rounded-xl text-sm hover:bg-blue-50 transition-colors"
          >
            <HomeIcon className="h-4 w-4" />
            Go Home
          </Link>
          <Link to="/dashboard"
            className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors"
          >
            My Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
