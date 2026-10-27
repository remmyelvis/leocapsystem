import { Link } from "react-router-dom";
import { forwardRef, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, Check, ChevronDown, Eye, EyeOff, Loader2, Lock, TriangleAlert, type LucideIcon } from "lucide-react";

// The parts every auth page is made of, so sign-in, reset and sign-up look and behave the same.

const inputBase =
  "w-full min-h-[48px] rounded-xl border bg-white pl-11 text-[15px] text-slate-900 placeholder:text-slate-500 transition-[border-color,box-shadow] focus:outline-none focus:ring-4 disabled:bg-slate-50 disabled:text-slate-400";
const inputOk = "border-slate-200 hover:border-slate-300 focus:border-brand-blue focus:ring-brand-blue/10";
const inputBad = "border-red-300 focus:border-red-400 focus:ring-red-100";

export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-1.5 flex items-center gap-1.5 text-[12px] text-red-600">
      <AlertCircle className="h-3 w-3 flex-shrink-0" /> {children}
    </p>
  );
}

function Label({ htmlFor, children, right }: { htmlFor: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-1.5 flex items-center justify-between">
      <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-slate-700">
        {children}
      </label>
      {right}
    </div>
  );
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  icon: LucideIcon;
  error?: string;
  labelRight?: ReactNode;
  /** Something that sits inside the box on the right (the show/hide button). */
  trailing?: ReactNode;
  hint?: ReactNode;
}

export const AuthField = forwardRef<HTMLInputElement, FieldProps>(function AuthField(
  { id, label, icon: Icon, error, labelRight, trailing, hint, className = "", ...input },
  ref
) {
  return (
    <div>
      <Label htmlFor={id} right={labelRight}>{label}</Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={ref}
          id={id}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
          className={`${inputBase} ${trailing ? "pr-12" : "pr-4"} ${error ? inputBad : inputOk} ${className}`}
          {...input}
        />
        {trailing}
      </div>
      {error ? <FieldError id={`${id}-err`}>{error}</FieldError> : hint}
    </div>
  );
});

// 0 = nothing typed. Length does most of the work; mixing cases, digits and symbols earns the rest.
export function passwordStrength(value: string): { score: number; label: string } {
  if (!value) return { score: 0, label: "" };
  let score = 1;
  if (value.length >= 8) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value)) score++;
  if (value.length >= 12 || /[^A-Za-z0-9]/.test(value)) score++;
  return { score, label: ["", "Weak", "Fair", "Good", "Strong"][score] };
}

export function StrengthMeter({ value }: { value: string }) {
  const { score, label } = passwordStrength(value);
  if (!score) return null;
  const colour = ["", "bg-red-400", "bg-amber-400", "bg-emerald-400", "bg-emerald-500"][score];
  const text = ["", "text-red-600", "text-amber-700", "text-emerald-700", "text-emerald-700"][score];
  return (
    <div className="mt-2 flex items-center gap-3" role="status" aria-label={`Password strength: ${label}`}>
      <div className="flex flex-1 gap-1" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= score ? colour : "bg-slate-200"}`} />
        ))}
      </div>
      <span className={`w-12 text-right text-[12px] font-semibold ${text}`}>{label}</span>
    </div>
  );
}

interface PasswordProps extends Omit<FieldProps, "icon" | "trailing" | "type"> {
  /** Warn when Caps Lock is on (sign-in); off for the confirm box. */
  caps?: boolean;
  /** Text shown under the box when there is no error, for example "Passwords match". */
  below?: ReactNode;
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordProps>(function PasswordField(
  { caps = false, below, error, id, onKeyUp, onKeyDown, ...rest },
  ref
) {
  const [show, setShow] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const watchCaps = (e: React.KeyboardEvent<HTMLInputElement>) => caps && setCapsOn(e.getModifierState("CapsLock"));
  return (
    <AuthField
      ref={ref}
      id={id}
      icon={Lock}
      error={error}
      type={show ? "text" : "password"}
      onKeyUp={(e) => { watchCaps(e); onKeyUp?.(e); }}
      onKeyDown={(e) => { watchCaps(e); onKeyDown?.(e); }}
      trailing={
        <button
          type="button"
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          onClick={() => setShow((p) => !p)}
          className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      }
      hint={
        <>
          {caps && capsOn && (
            <p role="status" className="mt-1.5 flex items-center gap-1.5 text-[12px] font-medium text-amber-700">
              <TriangleAlert className="h-3.5 w-3.5 flex-shrink-0" /> Caps Lock is on
            </p>
          )}
          {below}
        </>
      }
      {...rest}
    />
  );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  id: string;
  label: string;
  icon: LucideIcon;
  error?: string;
}

export const AuthSelect = forwardRef<HTMLSelectElement, SelectProps>(function AuthSelect({ id, label, icon: Icon, error, children, ...select }, ref) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <select
          ref={ref}
          id={id}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
          className={`${inputBase} appearance-none pr-10 ${error ? inputBad : inputOk}`}
          {...select}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
      {error && <FieldError id={`${id}-err`}>{error}</FieldError>}
    </div>
  );
});

export function AuthSubmit({ loading, loadingLabel, children, disabled }: { loading: boolean; loadingLabel: string; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="group flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-brand-blue text-[15px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(15,44,89,0.65)] transition-all hover:bg-[#0b2246] hover:shadow-[0_12px_28px_-10px_rgba(15,44,89,0.75)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/25 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-600 disabled:shadow-none"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> {loadingLabel}
        </>
      ) : (
        <>
          {children}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </>
      )}
    </button>
  );
}

export function AuthAlert({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-700 ring-1 ring-red-200">
      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export function MatchNote({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <p role="status" className="mt-1.5 flex items-center gap-1.5 text-[12px] font-medium text-emerald-700">
      <Check className="h-3.5 w-3.5" strokeWidth={3} /> Passwords match
    </p>
  );
}

export function AuthHeading({ title, sub }: { title: string; sub?: ReactNode }) {
  return (
    <>
      <h1 className="text-[28px] font-bold leading-tight tracking-[-0.015em] text-slate-900">{title}</h1>
      {sub && <p className="mt-1.5 text-[14px] leading-relaxed text-slate-600">{sub}</p>}
    </>
  );
}

export function AuthLinkButton({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="group flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-brand-blue text-[15px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(15,44,89,0.65)] transition-all hover:bg-[#0b2246] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/25"
    >
      {children}
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="tap-btn mb-6 inline-flex min-h-[32px] items-center gap-1.5 text-[13px] font-medium text-slate-600 transition-colors hover:text-slate-900">
      <ArrowLeft className="h-3.5 w-3.5" /> {children}
    </Link>
  );
}
