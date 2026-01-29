import { Outlet, Link, useLocation } from "react-router-dom";
import { Phone, Mail, MapPin, Instagram, Facebook, Youtube, Linkedin, Menu, MessageCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

// Try to import from PreviewSiteWrapper context first (for preview mode)
// Falls back to PublicSiteContext for production domains
let usePublicSiteContext: () => { organizationId: string | null; siteConfig: any; isLoading: boolean; error: string | null };
try {
  const previewContext = require('./PreviewSiteWrapper');
  usePublicSiteContext = previewContext.usePreviewSiteContext;
} catch {
  const publicContext = require('@/contexts/PublicSiteContext');
  usePublicSiteContext = publicContext.usePublicSiteContext;
}

export default function PublicSiteLayout() {
  const context = usePublicSiteContext();
  const siteConfig = context?.siteConfig;
  const isLoading = context?.isLoading;
  const error = context?.error;
  
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
    { href: "", label: "Início" },
    { href: "imoveis", label: "Imóveis" },
    { href: "sobre", label: "Sobre" },
    { href: "contato", label: "Contato" },
  ];

  // Get base path for preview mode
  const basePath = location.pathname.includes('/site/previsualização') 
    ? `/site/previsualização${location.search}` 
    : '';

  const isActive = (path: string) => {
    const currentPath = location.pathname.replace('/site/previsualização', '');
    if (path === "") return currentPath === "" || currentPath === "/";
    return currentPath.includes(`/${path}`);
  };

  const getHref = (path: string) => {
    if (location.pathname.includes('/site/previsualização')) {
      return `/site/previsualização/${path}${location.search}`;
    }
    return `/${path}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link to={getHref("")} className="flex items-center gap-3">
              {siteConfig.logo_url ? (
                <img 
                  src={siteConfig.logo_url} 
                  alt={siteConfig.site_title} 
                  className="h-12 md:h-14 w-auto object-contain"
                />
              ) : (
                <span 
                  className="text-2xl md:text-3xl font-bold"
                  style={{ color: siteConfig.primary_color }}
                >
                  {siteConfig.site_title}
                </span>
              )}
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={getHref(link.href)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    isActive(link.href) 
                      ? 'text-white' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  style={{ 
                    backgroundColor: isActive(link.href) ? siteConfig.primary_color : undefined,
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Desktop CTA */}
            <div className="hidden lg:flex items-center gap-3">
              {siteConfig.whatsapp && (
                <a
                  href={`https://wa.me/${siteConfig.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button 
                    className="rounded-full text-white shadow-lg hover:shadow-xl transition-all duration-200 gap-2"
                    style={{ backgroundColor: '#25D366' }}
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </Button>
                </a>
              )}
              {siteConfig.phone && (
                <a href={`tel:${siteConfig.phone}`}>
                  <Button 
                    variant="outline"
                    className="rounded-full border-2 gap-2"
                    style={{ borderColor: siteConfig.primary_color, color: siteConfig.primary_color }}
                  >
                    <Phone className="w-4 h-4" />
                    {siteConfig.phone}
                  </Button>
                </a>
              )}
            </div>

            {/* Mobile Menu Button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <button className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <Menu className="w-6 h-6 text-gray-700" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 p-0">
                <div className="flex flex-col h-full">
                  {/* Mobile Header */}
                  <div className="p-6 border-b">
                    {siteConfig.logo_url ? (
                      <img 
                        src={siteConfig.logo_url} 
                        alt={siteConfig.site_title} 
                        className="h-10 w-auto object-contain"
                      />
                    ) : (
                      <span 
                        className="text-xl font-bold"
                        style={{ color: siteConfig.primary_color }}
                      >
                        {siteConfig.site_title}
                      </span>
                    )}
                  </div>

                  {/* Mobile Navigation */}
                  <nav className="flex-1 p-4">
                    <div className="space-y-1">
                      {navLinks.map((link) => (
                        <Link
                          key={link.href}
                          to={getHref(link.href)}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center justify-between px-4 py-3 rounded-xl text-base font-medium transition-all ${
                            isActive(link.href) 
                              ? 'text-white' 
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                          style={{ 
                            backgroundColor: isActive(link.href) ? siteConfig.primary_color : undefined,
                          }}
                        >
                          {link.label}
                          <ChevronRight className="w-5 h-5 opacity-50" />
                        </Link>
                      ))}
                    </div>
                  </nav>

                  {/* Mobile CTAs */}
                  <div className="p-4 border-t space-y-3">
                    {siteConfig.whatsapp && (
                      <a
                        href={`https://wa.me/${siteConfig.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <Button 
                          className="w-full rounded-xl text-white gap-2"
                          style={{ backgroundColor: '#25D366' }}
                        >
                          <MessageCircle className="w-5 h-5" />
                          WhatsApp
                        </Button>
                      </a>
                    )}
                    {siteConfig.phone && (
                      <a href={`tel:${siteConfig.phone}`} className="block">
                        <Button 
                          variant="outline"
                          className="w-full rounded-xl gap-2"
                        >
                          <Phone className="w-5 h-5" />
                          Ligar Agora
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Floating WhatsApp Button - Mobile */}
      {siteConfig.whatsapp && (
        <a
          href={`https://wa.me/${siteConfig.whatsapp.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="lg:hidden fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-green-500 text-white shadow-lg flex items-center justify-center hover:bg-green-600 transition-colors"
        >
          <MessageCircle className="w-7 h-7" />
        </a>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        {/* Main Footer */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            {/* Brand */}
            <div className="lg:col-span-1">
              {siteConfig.logo_url ? (
                <img 
                  src={siteConfig.logo_url} 
                  alt={siteConfig.site_title} 
                  className="h-14 w-auto object-contain mb-4 brightness-0 invert"
                />
              ) : (
                <h3 className="text-2xl font-bold mb-4">{siteConfig.site_title}</h3>
              )}
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                {siteConfig.site_description || `Encontre o imóvel dos seus sonhos com a ${siteConfig.organization_name}.`}
              </p>
              {/* Social Links */}
              <div className="flex gap-3">
                {siteConfig.instagram && (
                  <a 
                    href={siteConfig.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                  >
                    <Instagram className="w-5 h-5" />
                  </a>
                )}
                {siteConfig.facebook && (
                  <a 
                    href={siteConfig.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                  >
                    <Facebook className="w-5 h-5" />
                  </a>
                )}
                {siteConfig.youtube && (
                  <a 
                    href={siteConfig.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                  >
                    <Youtube className="w-5 h-5" />
                  </a>
                )}
                {siteConfig.linkedin && (
                  <a 
                    href={siteConfig.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                  >
                    <Linkedin className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Navegação</h4>
              <ul className="space-y-3">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <Link 
                      to={getHref(link.href)}
                      className="text-gray-400 hover:text-white transition-colors text-sm"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Contato</h4>
              <ul className="space-y-3">
                {siteConfig.phone && (
                  <li>
                    <a 
                      href={`tel:${siteConfig.phone}`}
                      className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors text-sm"
                    >
                      <Phone className="w-4 h-4 flex-shrink-0" />
                      {siteConfig.phone}
                    </a>
                  </li>
                )}
                {siteConfig.whatsapp && (
                  <li>
                    <a 
                      href={`https://wa.me/${siteConfig.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors text-sm"
                    >
                      <MessageCircle className="w-4 h-4 flex-shrink-0" />
                      WhatsApp
                    </a>
                  </li>
                )}
                {siteConfig.email && (
                  <li>
                    <a 
                      href={`mailto:${siteConfig.email}`}
                      className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors text-sm"
                    >
                      <Mail className="w-4 h-4 flex-shrink-0" />
                      {siteConfig.email}
                    </a>
                  </li>
                )}
              </ul>
            </div>

            {/* Address */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Endereço</h4>
              {siteConfig.address && (
                <p className="flex items-start gap-3 text-gray-400 text-sm">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>
                    {siteConfig.address}
                    {siteConfig.city && <><br />{siteConfig.city}</>}
                    {siteConfig.state && ` - ${siteConfig.state}`}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
              <p>© {new Date().getFullYear()} {siteConfig.organization_name}. Todos os direitos reservados.</p>
              <p>
                Desenvolvido por{' '}
                <a 
                  href="https://vimob.com.br" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-white hover:underline font-medium"
                >
                  VIMOB
                </a>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
