import {
  ArrowUpRight,
  Building2,
  LockKeyhole,
  ShieldCheck,
  Users,
} from "lucide-react";
import { BrandLogo } from "./brand-logo";
export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main id="main" className="auth-layout">
      <section className="auth-story" aria-label="JN Fin Services workspace">
        <div className="brand-lockup">
          <BrandLogo priority className="h-20 w-20" />
          <div>
            <p className="brand-name">JN Fin Services</p>
            <p className="brand-caption">SUSTAINABLE GROWTH</p>
          </div>
        </div>
        <div className="auth-story-content">
          <p className="gold-eyebrow">
            <span /> THE PEOPLE BEHIND EVERY BRANCH
          </p>
          <h2 className="auth-headline">
            Built on trust.
            <br />
            <em>Connected for growth.</em>
          </h2>
          <p className="auth-story-description">
            One considered workspace for your people, your branches, and
            everything that brings them together.
          </p>
          <div className="auth-pillars">
            <div>
              <Building2 size={20} />
              <span>Connected branches</span>
            </div>
            <div>
              <Users size={20} />
              <span>Empowered teams</span>
            </div>
            <div>
              <ShieldCheck size={20} />
              <span>Controlled access</span>
            </div>
          </div>
        </div>
        <div className="auth-story-footer">
          <span>Clarity in every operation.</span>
          <ArrowUpRight size={18} />
        </div>
      </section>
      <section className="auth-entry">
        <div className="auth-card">
          <div className="auth-card-brand">
            <BrandLogo priority className="h-24 w-24" />
            <p className="eyebrow">JN Fin Services</p>
          </div>
          <div className="auth-title">
            <h1>{title}</h1>
            <p className="muted">{description}</p>
          </div>
          {children}
          <div className="auth-security">
            <LockKeyhole size={14} />
            <span>Private workspace · Authorised staff only</span>
          </div>
        </div>
        <p className="auth-help">
          Need access? Contact your branch administrator.
        </p>
        <p className="auth-copyright">
          JN FIN SERVICES <span>•</span> SUSTAINABLE GROWTH
        </p>
      </section>
    </main>
  );
}
