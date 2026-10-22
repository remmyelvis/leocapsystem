import { Navigate, useLocation } from "react-router-dom";

// The portal picker became a switch above the sign-in form, so this address (the landing page's "Sign In") goes straight to it.
export default function LoginPortalPage() {
  const { search } = useLocation();
  return <Navigate to={{ pathname: "/login/applicant", search }} replace />;
}
