import Link from 'next/link';

export default function Footer() {
  return (
    <div className="layout-footer">
        <div className="footer-logo-container">
            <img src='/plan4ldn/img/logo_orriz.png' alt="plan4ldn" />
            <img src='/plan4ldn/img/loghi.png' alt="soils4med" />
            <span className="footer-app-name">PLAN4LDN Tool</span>
        </div>
        <span className="footer-copyright">&#169; CRS4, UNISS - 2025</span>
    </div>
   );
}
