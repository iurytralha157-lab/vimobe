import { Outlet, Link, useLocation } from "react-router-dom";
import { usePublicSiteContext } from "@/contexts/PublicSiteContext";
import { Phone, Mail, MapPin, Instagram, Facebook, Youtube, Linkedin, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

export default function PublicSiteLayout() {
  const { siteConfig, isLoading, error } = usePublicSiteContext();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Apply custom colors as CSS variables
  useEffect(() => {
    if (siteConfig) {
      document.documentElement.style.setProperty('--site-primary', siteConfig.primary_color || '#F97316');
      document.documentElement.style.setProperty('--site-secondary', siteConfig.secondary_color || '#1E293B');
      document.documentElement.style.setProperty('--site-accent', siteConfig.accent_color || '#3B82F6');
    }
  }, [siteConfig]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error || !siteConfig) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Site não encontrado</h1>
        <p className="text-gray-600">Verifique o endereço e tente novamente.</p>
      </div>
    );
  }

  const navLinks = [
    { href: "/", label: "Início" },
    { href: "/imoveis", label: "Imóveis" },
    { href: "/sobre", label: "Sobre" },
    { href: "/contato", label: "Contato" },
  ];

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header 
        className="sticky top-0 z-50 bg-white shadow-sm"
        style={{ borderBottom: `3px solid ${siteConfig.primary_color}` }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3">
              {siteConfig.logo_url ? (
                <img 
                  src={siteConfig.logo_url} 
                  alt={siteConfig.site_title} 
                  className="h-10 md:h-12 w-auto object-contain"
                />
              ) : (
                <span 
                  className="text-xl md:text-2xl font-bold"
                  style={{ color: siteConfig.secondary_color }}
                >
                  {siteConfig.site_title}
                </span>
              )}
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`text-sm font-medium transition-colors hover:text-orange-500 ${
                    isActive(link.href) ? 'text-orange-500' : 'text-gray-700'
                  }`}
                  style={{ 
                    color: isActive(link.href) ? siteConfig.primary_color : undefined,
                  }}
                >
                  {link.label}
                </Link>
              ))}
              {siteConfig.whatsapp && (
                <a
                  href={`https://wa.me/${siteConfig.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button 
                    size="sm"
                    style={{ backgroundColor: siteConfig.primary_color }}
                    className="text-white hover:opacity-90"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Fale Conosco
                  </Button>
                </a>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-gray-700" />
              ) : (
                <Menu className="w-6 h-6 text-gray-700" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t">
            <nav className="flex flex-col px-4 py-4 gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`px-4 py-3 rounded-lg text-sm font-medium ${
                    isActive(link.href) 
                      ? 'bg-orange-50 text-orange-600' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {siteConfig.whatsapp && (
                <a
                  href={`https://wa.me/${siteConfig.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2"
                >
                  <Button 
                    className="w-full text-white"
                    style={{ backgroundColor: siteConfig.primary_color }}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Fale Conosco
                  </Button>
                </a>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer 
        className="text-white"
        style={{ backgroundColor: siteConfig.secondary_color }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* About */}
            <div>
              {siteConfig.logo_url ? (
                <img 
                  src={siteConfig.logo_url} 
                  alt={siteConfig.site_title} 
                  className="h-12 w-auto object-contain mb-4 brightness-0 invert"
                />
              ) : (
                <h3 className="text-xl font-bold mb-4">{siteConfig.site_title}</h3>
              )}
              <p className="text-gray-300 text-sm leading-relaxed">
                {siteConfig.site_description || `Encontre o imóvel dos seus sonhos com a ${siteConfig.organization_name}.`}
              </p>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Contato</h3>
              <div className="space-y-3">
                {siteConfig.phone && (
                  <a 
                    href={`tel:${siteConfig.phone}`}
                    className="flex items-center gap-2 text-gray-300 hover:text-white text-sm"
                  >
                    <Phone className="w-4 h-4" />
                    {siteConfig.phone}
                  </a>
                )}
                {siteConfig.email && (
                  <a 
                    href={`mailto:${siteConfig.email}`}
                    className="flex items-center gap-2 text-gray-300 hover:text-white text-sm"
                  >
                    <Mail className="w-4 h-4" />
                    {siteConfig.email}
                  </a>
                )}
                {siteConfig.address && (
                  <p className="flex items-start gap-2 text-gray-300 text-sm">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>
                      {siteConfig.address}
                      {siteConfig.city && `, ${siteConfig.city}`}
                      {siteConfig.state && ` - ${siteConfig.state}`}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* Social */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Redes Sociais</h3>
              <div className="flex gap-4">
                {siteConfig.instagram && (
                  <a 
                    href={siteConfig.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    <Instagram className="w-5 h-5" />
                  </a>
                )}
                {siteConfig.facebook && (
                  <a 
                    href={siteConfig.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    <Facebook className="w-5 h-5" />
                  </a>
                )}
                {siteConfig.youtube && (
                  <a 
                    href={siteConfig.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    <Youtube className="w-5 h-5" />
                  </a>
                )}
                {siteConfig.linkedin && (
                  <a 
                    href={siteConfig.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    <Linkedin className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-white/20 mt-8 pt-8 text-center text-gray-400 text-sm">
            <p>© {new Date().getFullYear()} {siteConfig.organization_name}. Todos os direitos reservados.</p>
            <p className="mt-1">
              Desenvolvido por{' '}
              <a 
                href="https://vimob.com.br" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white hover:underline"
              >
                VIMOB
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
