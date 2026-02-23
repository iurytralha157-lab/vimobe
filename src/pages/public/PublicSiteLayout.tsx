import { Outlet, Link, useLocation } from "react-router-dom";
import { Phone, Mail, MapPin, Instagram, Facebook, Youtube, Linkedin, Menu, MessageCircle, Heart } from "lucide-react";
import { usePublicFavorites } from "@/hooks/use-public-favorites";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { usePublicContext } from "./usePublicContext";
import { usePropertyTypes } from "@/hooks/use-public-site";
import { ContactFormDialog } from "@/components/public/ContactFormDialog";

export default function PublicSiteLayout() {
  const { organizationId, siteConfig, isLoading, error } = usePublicContext();
  const { data: propertyTypes = [] } = usePropertyTypes(organizationId);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { count: favCount } = usePublicFavorites();
  const location = useLocation();

  // Get colors from config with fallbacks
  const primaryColor = siteConfig?.primary_color || '#C4A052';
  const secondaryColor = siteConfig?.secondary_color || '#0D0D0D';
  const backgroundColor = siteConfig?.background_color || '#0D0D0D';
  const textColor = siteConfig?.text_color || '#FFFFFF';
  const isDarkTheme = siteConfig?.site_theme !== 'light';

  // Dynamic document title & favicon based on site config
  useEffect(() => {
    if (!siteConfig) return;

    const originalTitle = document.title;
    const originalFavicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.href;

    document.title = siteConfig.seo_title || siteConfig.site_title || 'Site Imobiliário';

    if (siteConfig.favicon_url) {
      let faviconLink = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!faviconLink) {
        faviconLink = document.createElement('link');
        faviconLink.rel = 'icon';
        document.head.appendChild(faviconLink);
      }
      faviconLink.href = siteConfig.favicon_url;
    }

    return () => {
      document.title = originalTitle;
      if (originalFavicon) {
        const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
        if (link) link.href = originalFavicon;
      }
    };
  }, [siteConfig]);

  // Close mobile menu on route change (scroll handled by ScrollToTop component)
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Helper function for footer link clicks
  const handleFooterClick = () => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor }}>
        <div 
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderColor: primaryColor }}
        ></div>
      </div>
    );
  }

  if (error || !siteConfig) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor, color: textColor }}>
        <h1 className="text-2xl font-bold mb-2">Site não encontrado</h1>
        <p style={{ opacity: 0.6 }}>{error || 'Verifique o endereço e tente novamente.'}</p>
      </div>
    );
  }

  const isPreviewMode = location.pathname.includes('/site/preview') || location.pathname.includes('/site/previsualização');
  const orgParam = new URLSearchParams(location.search).get('org');

  const isActive = (path: string) => {
    const currentPath = location.pathname.replace('/site/preview', '').replace('/site/previsualização', '');
    if (path === "") return currentPath === "" || currentPath === "/";
    return currentPath.includes(`/${path}`);
  };

  // Check if a filter link is active based on query params
  const isFilterActive = (href: string) => {
    const urlParams = new URLSearchParams(location.search);
    const currentPath = location.pathname.replace('/site/preview', '').replace('/site/previsualização', '');
    
    // Only highlight if we're on the properties page
    if (!currentPath.includes('/imoveis')) return false;
    
    if (href.includes('tipo=Apartamento')) return urlParams.get('tipo') === 'Apartamento';
    if (href.includes('tipo=Casa')) return urlParams.get('tipo') === 'Casa';
    if (href.includes('finalidade=aluguel')) return urlParams.get('finalidade') === 'aluguel';
    return false;
  };

  const getHref = (path: string) => {
    if (isPreviewMode && orgParam) {
      if (path.includes('?')) {
        return `/site/preview/${path}&org=${orgParam}`;
      }
      return `/site/preview/${path}?org=${orgParam}`;
    }
    const siteMatch = location.pathname.match(/^\/sites\/([^/]+)/);
    if (siteMatch) {
      return `/sites/${siteMatch[1]}/${path}`;
    }
    return `/${path}`;
  };

  // Dynamic nav links with property types and pre-applied filters
  const mainNavLinks = [
    { href: "", label: "HOME" },
    { href: "imoveis", label: "IMÓVEIS" },
    { href: "sobre", label: "SOBRE" },
  ];

  // Add pre-filtered links
  const filterLinks = [
    { href: "imoveis?tipo=Apartamento", label: "APARTAMENTOS" },
    { href: "imoveis?tipo=Casa", label: "CASAS" },
    { href: "imoveis?finalidade=aluguel", label: "ALUGUEL" },
  ];

  return (
    <div className="min-h-screen flex flex-col public-site-wrapper" style={{ backgroundColor, color: textColor }}>
      {/* Header - Floating Glassmorphism */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="max-w-[1200px] mx-auto px-4 pt-4">
          <div 
            className="backdrop-blur-xl rounded-2xl px-8 pl-4"
            style={{ backgroundColor: isDarkTheme ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.8)', borderBottom: isDarkTheme ? 'none' : '1px solid rgba(0,0,0,0.1)' }}
          >
            <div className="flex justify-between items-center h-[70px]">
              {/* Logo */}
              <Link to={getHref("")} className="flex items-center">
                {siteConfig.logo_url ? (
                  <img 
                    src={siteConfig.logo_url} 
                    alt={siteConfig.site_title} 
                    style={{ 
                      maxWidth: Math.min(siteConfig.logo_width || 160, 140), 
                      maxHeight: Math.min(siteConfig.logo_height || 50, 40) 
                    }}
                    className="w-auto object-contain lg:max-w-none lg:max-h-none"
                  />
                ) : (
                  <span className="text-lg md:text-xl font-semibold tracking-wider" style={{ color: isDarkTheme ? '#fff' : '#1a1a1a' }}>
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
                      color: isActive(link.href) ? primaryColor : (isDarkTheme ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)')
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = primaryColor}
                    onMouseLeave={(e) => e.currentTarget.style.color = isActive(link.href) ? primaryColor : (isDarkTheme ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)')}
                  >
                    {link.label}
                  </Link>
                ))}
                
                {/* Pre-filtered Links */}
                {filterLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={getHref(link.href)}
                    className="px-4 py-2 text-sm font-light tracking-wider transition-colors"
                    style={{ 
                      color: isFilterActive(link.href) ? primaryColor : (isDarkTheme ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)')
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = primaryColor}
                    onMouseLeave={(e) => e.currentTarget.style.color = isFilterActive(link.href) ? primaryColor : (isDarkTheme ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)')}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              {/* Desktop CTA */}
              <div className="hidden lg:flex items-center gap-4">
                <Link to={getHref("favoritos")} className="relative transition-colors" style={{ color: isDarkTheme ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)' }}>
                  <Heart className="w-5 h-5" />
                  {favCount > 0 && (
                    <span 
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {favCount}
                    </span>
                  )}
                </Link>
                <Link 
                  to={getHref("contato")}
                  className="px-6 py-2.5 rounded-full text-sm font-light tracking-wide transition-colors hover:opacity-90"
                  style={{ backgroundColor: primaryColor, color: 'white' }}
                >
                  CONTATO
                </Link>
              </div>

              {/* Mobile Menu Button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <button className="lg:hidden p-2" style={{ color: isDarkTheme ? '#fff' : '#1a1a1a' }}>
                  <Menu className="w-6 h-6" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 p-0 border-0" style={{ backgroundColor, borderColor: isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                <div className="flex flex-col h-full">
                  {/* Mobile Header */}
                  <div className="p-6 flex items-center justify-between" style={{ borderBottom: `1px solid ${isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}>
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
                      <span className="text-lg font-semibold tracking-wider" style={{ color: textColor }}>
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
                            color: isActive(link.href) ? primaryColor : (isDarkTheme ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)'),
                            backgroundColor: isActive(link.href) ? (isDarkTheme ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)') : 'transparent'
                          }}
                        >
                          {link.label}
                        </Link>
                      ))}
                      
                      <div className="my-4" style={{ borderTop: `1px solid ${isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}></div>
                      
                      {filterLinks.map((link) => (
                        <Link
                          key={link.href}
                          to={getHref(link.href)}
                          onClick={() => setMobileMenuOpen(false)}
                          className="block px-4 py-3 text-sm font-medium tracking-wider transition-colors"
                          style={{ color: isDarkTheme ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)' }}
                        >
                          {link.label}
                        </Link>
                      ))}
                      
                      <div className="my-4" style={{ borderTop: `1px solid ${isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}></div>
                      
                      <Link
                        to={getHref("contato")}
                        onClick={() => setMobileMenuOpen(false)}
                        className="block px-4 py-3 text-sm font-medium tracking-wider transition-colors"
                        style={{ color: primaryColor }}
                      >
                        CONTATO
                      </Link>
                    </div>
                  </nav>

                  {/* Mobile Footer */}
                  {siteConfig.whatsapp && (
                    <div className="p-4" style={{ borderTop: `1px solid ${isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}>
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

      {/* Floating WhatsApp Button - Mobile - Opens Contact Form */}
      {siteConfig.whatsapp && organizationId && (
        <div className="lg:hidden fixed bottom-6 right-6 z-50">
          <ContactFormDialog
            organizationId={organizationId}
            whatsappNumber={siteConfig.whatsapp}
            primaryColor={primaryColor}
            trigger={
              <button className="w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg flex items-center justify-center hover:bg-[#20BD5A] transition-colors">
                <MessageCircle className="w-7 h-7" />
              </button>
            }
          />
        </div>
      )}

      {/* Footer - Dark Style */}
      <footer 
        style={{ backgroundColor: secondaryColor, color: textColor, borderTop: `1px solid ${isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-10">
            {/* Brand */}
            <div className="text-center md:text-left">
              <div className="flex justify-center md:justify-start">
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
                  <h3 className="text-xl font-semibold tracking-wider mb-4">{siteConfig.site_title}</h3>
                )}
              </div>
              <p className="text-white/60 text-sm leading-relaxed mb-4 md:mb-6">
                {siteConfig.site_description || `Encontre o imóvel dos seus sonhos com a ${siteConfig.organization_name}.`}
              </p>
            </div>

            {/* Menu & Contact - 2 columns on mobile */}
            <div className="grid grid-cols-2 md:contents gap-4 text-center md:text-left">
              {/* Menu */}
              <div>
                <h4 
                  className="text-sm font-semibold uppercase tracking-wider mb-3 md:mb-4"
                  style={{ color: primaryColor }}
                >
                  Menu
                </h4>
                <ul className="space-y-2 md:space-y-3">
                  {mainNavLinks.map((link) => (
                    <li key={link.href}>
                      <Link 
                        to={getHref(link.href)}
                        onClick={handleFooterClick}
                        className="text-white/60 hover:text-white transition-colors text-sm"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link 
                      to={getHref("contato")}
                      onClick={handleFooterClick}
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
                  className="text-sm font-semibold uppercase tracking-wider mb-3 md:mb-4"
                  style={{ color: primaryColor }}
                >
                  Contato
                </h4>
                <ul className="space-y-2 md:space-y-3">
                  {siteConfig.phone && (
                    <li>
                      <a 
                        href={`tel:${siteConfig.phone}`}
                        className="flex items-center justify-center md:justify-start gap-2 md:gap-3 text-white/60 hover:text-white transition-colors text-sm"
                      >
                        <Phone className="w-4 h-4 flex-shrink-0" />
                        <span className="hidden md:inline">{siteConfig.phone}</span>
                        <span className="md:hidden">Telefone</span>
                      </a>
                    </li>
                  )}
                  {siteConfig.whatsapp && organizationId && (
                    <li className="flex justify-center md:justify-start">
                      <ContactFormDialog
                        organizationId={organizationId}
                        whatsappNumber={siteConfig.whatsapp}
                        primaryColor={primaryColor}
                        trigger={
                          <button className="flex items-center gap-2 md:gap-3 text-white/60 hover:text-white transition-colors text-sm cursor-pointer">
                            <MessageCircle className="w-4 h-4 flex-shrink-0" />
                            WhatsApp
                          </button>
                        }
                      />
                    </li>
                  )}
                  {siteConfig.email && (
                    <li>
                      <a 
                        href={`mailto:${siteConfig.email}`}
                        className="flex items-center justify-center md:justify-start gap-2 md:gap-3 text-white/60 hover:text-white transition-colors text-sm"
                      >
                        <Mail className="w-4 h-4 flex-shrink-0" />
                        <span className="hidden md:inline">{siteConfig.email}</span>
                        <span className="md:hidden">E-mail</span>
                      </a>
                    </li>
                  )}
                </ul>
                {siteConfig.address && (
                  <div className="flex items-start justify-center md:justify-start gap-2 text-white/60 text-sm mt-3">
                    <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      {siteConfig.address}
                      {siteConfig.city && <><br />{siteConfig.city}</>}
                      {siteConfig.state && ` - ${siteConfig.state}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Social */}
            <div className="text-center md:text-left col-span-1">
              <h4 
                className="text-sm font-semibold uppercase tracking-wider mb-3 md:mb-4"
                style={{ color: primaryColor }}
              >
                Redes Sociais
              </h4>
              <div className="flex gap-3 justify-center md:justify-start">
                {siteConfig.instagram && (
                  <a 
                    href={siteConfig.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center transition-colors"
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
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
