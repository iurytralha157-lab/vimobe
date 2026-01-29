import { Outlet, Link, useLocation } from "react-router-dom";
import { Phone, Mail, MapPin, Instagram, Facebook, Youtube, Linkedin, Menu, MessageCircle, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { usePublicContext } from "./usePublicContext";
import { usePropertyTypes } from "@/hooks/use-public-site";

export default function PublicSiteLayout() {
  const { organizationId, siteConfig, isLoading, error } = usePublicContext();
  const { data: propertyTypes = [] } = usePropertyTypes(organizationId);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Get colors from config with fallbacks
  const primaryColor = siteConfig?.primary_color || '#C4A052';
  const secondaryColor = siteConfig?.secondary_color || '#0D0D0D';

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D0D0D]">
        <div 
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderColor: primaryColor }}
        ></div>
      </div>
    );
  }

  if (error || !siteConfig) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0D0D0D] text-white">
        <h1 className="text-2xl font-bold mb-2">Site não encontrado</h1>
        <p className="text-white/60">{error || 'Verifique o endereço e tente novamente.'}</p>
      </div>
    );
  }

  const isActive = (path: string) => {
    const currentPath = location.pathname.replace('/site/previsualização', '');
    if (path === "") return currentPath === "" || currentPath === "/";
    return currentPath.includes(`/${path}`);
  };

  const getHref = (path: string) => {
    if (location.pathname.includes('/site/previsualização')) {
      // Preserve org param and add any new params
      const orgParam = new URLSearchParams(location.search).get('org');
      if (path.includes('?')) {
        return `/site/previsualização/${path}&org=${orgParam}`;
      }
      return `/site/previsualização/${path}?org=${orgParam}`;
    }
    return `/${path}`;
  };

  // Dynamic nav links with property types and pre-applied filters
  const mainNavLinks = [
    { href: "", label: "HOME" },
    { href: "mapa", label: "BUSCAR MAPA" },
    { href: "imoveis", label: "IMÓVEIS" },
  ];

  // Add pre-filtered links
  const filterLinks = [
    { href: "imoveis?tipo=Apartamento", label: "APARTAMENTOS" },
    { href: "imoveis?tipo=Casa", label: "CASAS" },
    { href: "imoveis?finalidade=aluguel", label: "ALUGUEL" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0D0D0D]">
      {/* Header - Floating Glassmorphism */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="max-w-[1200px] mx-auto px-4 pt-4">
          <div className="bg-black/40 backdrop-blur-xl rounded-2xl px-8 pl-4">
            <div className="flex justify-between items-center h-[70px]">
              {/* Logo */}
              <Link to={getHref("")} className="flex items-center">
                {siteConfig.logo_url ? (
                  <img 
                    src={siteConfig.logo_url} 
                    alt={siteConfig.site_title} 
                    style={{ 
                      maxWidth: siteConfig.logo_width || 160, 
                      maxHeight: siteConfig.logo_height || 50 
                    }}
                    className="w-auto object-contain"
                  />
                ) : (
                  <span className="text-lg md:text-xl font-serif text-white tracking-wider">
                    {siteConfig.site_title}
                  </span>
                )}
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden lg:flex items-center gap-1">
                {mainNavLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={getHref(link.href)}
                    className="px-4 py-2 text-sm font-light tracking-wider transition-colors"
                    style={{ 
                      color: isActive(link.href) ? primaryColor : 'rgba(255,255,255,0.8)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = primaryColor}
                    onMouseLeave={(e) => e.currentTarget.style.color = isActive(link.href) ? primaryColor : 'rgba(255,255,255,0.8)'}
                  >
                    {link.label}
                  </Link>
                ))}
                
                {/* Pre-filtered Links */}
                {filterLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={getHref(link.href)}
                    className="px-4 py-2 text-sm font-light tracking-wider text-white/80 transition-colors"
                    onMouseEnter={(e) => e.currentTarget.style.color = primaryColor}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              {/* Desktop CTA */}
              <div className="hidden lg:flex items-center gap-4">
                <button className="text-white/80 hover:text-white transition-colors">
                  <Heart className="w-5 h-5" />
                </button>
                <Link 
                  to={getHref("contato")}
                  className="bg-white text-gray-800 px-6 py-2.5 rounded-full text-sm font-light tracking-wide hover:bg-white/90 transition-colors"
                >
                  CONTATO
                </Link>
              </div>

              {/* Mobile Menu Button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <button className="lg:hidden p-2 text-white">
                  <Menu className="w-6 h-6" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 p-0 bg-[#0D0D0D] border-white/10">
                <div className="flex flex-col h-full">
                  {/* Mobile Header */}
                  <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    {siteConfig.logo_url ? (
                      <img 
                        src={siteConfig.logo_url} 
                        alt={siteConfig.site_title} 
                        style={{ 
                          maxWidth: Math.min(siteConfig.logo_width || 160, 200), 
                          maxHeight: Math.min(siteConfig.logo_height || 50, 40) 
                        }}
                        className="w-auto object-contain"
                      />
                    ) : (
                      <span className="text-lg font-serif text-white">
                        {siteConfig.site_title}
                      </span>
                    )}
                  </div>

                  {/* Mobile Navigation */}
                  <nav className="flex-1 p-4">
                    <div className="space-y-1">
                      {mainNavLinks.map((link) => (
                        <Link
                          key={link.href}
                          to={getHref(link.href)}
                          onClick={() => setMobileMenuOpen(false)}
                          className="block px-4 py-3 text-sm font-medium tracking-wider transition-colors"
                          style={{ 
                            color: isActive(link.href) ? primaryColor : 'rgba(255,255,255,0.8)',
                            backgroundColor: isActive(link.href) ? 'rgba(255,255,255,0.05)' : 'transparent'
                          }}
                        >
                          {link.label}
                        </Link>
                      ))}
                      
                      <div className="border-t border-white/10 my-4"></div>
                      
                      {filterLinks.map((link) => (
                        <Link
                          key={link.href}
                          to={getHref(link.href)}
                          onClick={() => setMobileMenuOpen(false)}
                          className="block px-4 py-3 text-sm font-medium tracking-wider text-white/80 hover:bg-white/5 transition-colors"
                          style={{ ':hover': { color: primaryColor } } as React.CSSProperties}
                        >
                          {link.label}
                        </Link>
                      ))}
                      
                      <div className="border-t border-white/10 my-4"></div>
                      
                      <Link
                        to={getHref("contato")}
                        onClick={() => setMobileMenuOpen(false)}
                        className="block px-4 py-3 text-sm font-medium tracking-wider hover:bg-white/5 transition-colors"
                        style={{ color: primaryColor }}
                      >
                        CONTATO
                      </Link>
                    </div>
                  </nav>

                  {/* Mobile Footer */}
                  {siteConfig.whatsapp && (
                    <div className="p-4 border-t border-white/10">
                      <a
                        href={`https://wa.me/${siteConfig.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-3 bg-[#25D366] text-white font-medium rounded"
                      >
                        <MessageCircle className="w-5 h-5" />
                        WhatsApp
                      </a>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Add padding for fixed header */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Floating WhatsApp Button - Mobile */}
      {siteConfig.whatsapp && (
        <a
          href={`https://wa.me/${siteConfig.whatsapp.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="lg:hidden fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg flex items-center justify-center hover:bg-[#20BD5A] transition-colors"
        >
          <MessageCircle className="w-7 h-7" />
        </a>
      )}

      {/* Footer - Dark Style */}
      <footer 
        className="text-white border-t border-white/10"
        style={{ backgroundColor: secondaryColor }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            {/* Brand */}
            <div>
              {siteConfig.logo_url ? (
                <img 
                  src={siteConfig.logo_url} 
                  alt={siteConfig.site_title} 
                  style={{ 
                    maxWidth: siteConfig.logo_width || 160, 
                    maxHeight: siteConfig.logo_height || 50 
                  }}
                  className="w-auto object-contain mb-4"
                />
              ) : (
                <h3 className="text-xl font-serif mb-4">{siteConfig.site_title}</h3>
              )}
              <p className="text-white/60 text-sm leading-relaxed mb-6">
                {siteConfig.site_description || `Encontre o imóvel dos seus sonhos com a ${siteConfig.organization_name}.`}
              </p>
            </div>

            {/* Menu */}
            <div>
              <h4 
                className="text-sm font-semibold uppercase tracking-wider mb-4"
                style={{ color: primaryColor }}
              >
                Menu
              </h4>
              <ul className="space-y-3">
                {mainNavLinks.map((link) => (
                  <li key={link.href}>
                    <Link 
                      to={getHref(link.href)}
                      className="text-white/60 hover:text-white transition-colors text-sm"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link 
                    to={getHref("contato")}
                    className="text-white/60 hover:text-white transition-colors text-sm"
                  >
                    CONTATO
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 
                className="text-sm font-semibold uppercase tracking-wider mb-4"
                style={{ color: primaryColor }}
              >
                Contato
              </h4>
              <ul className="space-y-3">
                {siteConfig.phone && (
                  <li>
                    <a 
                      href={`tel:${siteConfig.phone}`}
                      className="flex items-center gap-3 text-white/60 hover:text-white transition-colors text-sm"
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
                      className="flex items-center gap-3 text-white/60 hover:text-white transition-colors text-sm"
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
                      className="flex items-center gap-3 text-white/60 hover:text-white transition-colors text-sm"
                    >
                      <Mail className="w-4 h-4 flex-shrink-0" />
                      {siteConfig.email}
                    </a>
                  </li>
                )}
                {siteConfig.address && (
                  <li className="flex items-start gap-3 text-white/60 text-sm">
                    <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      {siteConfig.address}
                      {siteConfig.city && <><br />{siteConfig.city}</>}
                      {siteConfig.state && ` - ${siteConfig.state}`}
                    </span>
                  </li>
                )}
              </ul>
            </div>

            {/* Social */}
            <div>
              <h4 
                className="text-sm font-semibold uppercase tracking-wider mb-4"
                style={{ color: primaryColor }}
              >
                Redes Sociais
              </h4>
              <div className="flex gap-3">
                {siteConfig.instagram && (
                  <a 
                    href={siteConfig.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center transition-colors"
                    style={{ ':hover': { backgroundColor: primaryColor } } as React.CSSProperties}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = primaryColor}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                  >
                    <Instagram className="w-5 h-5" />
                  </a>
                )}
                {siteConfig.facebook && (
                  <a 
                    href={siteConfig.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center transition-colors"
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = primaryColor}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                  >
                    <Facebook className="w-5 h-5" />
                  </a>
                )}
                {siteConfig.youtube && (
                  <a 
                    href={siteConfig.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center transition-colors"
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = primaryColor}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                  >
                    <Youtube className="w-5 h-5" />
                  </a>
                )}
                {siteConfig.linkedin && (
                  <a 
                    href={siteConfig.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center transition-colors"
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = primaryColor}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                  >
                    <Linkedin className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-white/40">
              <p>© {new Date().getFullYear()} {siteConfig.organization_name}. Todos os direitos reservados.</p>
              <p>
                Desenvolvido por{' '}
                <a 
                  href="https://vimob.com.br" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                  style={{ color: primaryColor }}
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
