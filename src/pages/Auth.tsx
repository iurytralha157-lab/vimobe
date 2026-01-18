import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Building2, Loader2, Sparkles } from "lucide-react";

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const { signIn, signUp } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);
    if (!error) navigate("/");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signUp(email, password, name);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 gradient-bg" />
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md space-y-8 p-4 z-10">
        {/* Logo */}
        <div className="flex flex-col items-center space-y-4 animate-fade-in">
          <div className="relative">
            <div className="flex items-center justify-center h-20 w-20 rounded-2xl gradient-primary shadow-glow-lg">
              <Building2 className="h-10 w-10 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 flex items-center justify-center h-6 w-6 rounded-full bg-accent">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-4xl font-bold tracking-tight text-gradient">Vimob</h1>
            <p className="text-muted-foreground">CRM Imobiliário Inteligente</p>
          </div>
        </div>

        {/* Auth Card */}
        <Card className="border-0 shadow-soft-lg glass animate-scale-in">
          <Tabs defaultValue="login" className="w-full">
            <CardHeader className="pb-4">
              <TabsList className="grid w-full grid-cols-2 h-12 p-1 bg-muted/50">
                <TabsTrigger value="login" className="text-sm font-medium data-[state=active]:shadow-sm">
                  {t("auth.login")}
                </TabsTrigger>
                <TabsTrigger value="register" className="text-sm font-medium data-[state=active]:shadow-sm">
                  {t("auth.register")}
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent className="pt-0">
              {/* Login Tab */}
              <TabsContent value="login" className="mt-0 space-y-4">
                <CardDescription className="text-center">
                  {t("auth.welcomeBack")}
                </CardDescription>

                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-sm font-medium">
                      {t("auth.email")}
                    </Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-11 bg-background/50 border-border/50 focus:bg-background transition-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-sm font-medium">
                      {t("auth.password")}
                    </Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-11 bg-background/50 border-border/50 focus:bg-background transition-colors"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-11 gradient-primary hover:opacity-90 transition-opacity font-medium" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("common.loading")}
                      </>
                    ) : (
                      t("auth.login")
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="link"
                    className="w-full text-sm text-muted-foreground hover:text-primary"
                    onClick={() => {}}
                  >
                    {t("auth.forgotPassword")}
                  </Button>
                </form>
              </TabsContent>

              {/* Register Tab */}
              <TabsContent value="register" className="mt-0 space-y-4">
                <CardDescription className="text-center">
                  {t("auth.createAccount")}
                </CardDescription>

                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name" className="text-sm font-medium">
                      {t("common.name")}
                    </Label>
                    <Input
                      id="register-name"
                      type="text"
                      placeholder="Seu nome"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-11 bg-background/50 border-border/50 focus:bg-background transition-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email" className="text-sm font-medium">
                      {t("auth.email")}
                    </Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-11 bg-background/50 border-border/50 focus:bg-background transition-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password" className="text-sm font-medium">
                      {t("auth.password")}
                    </Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      minLength={6}
                      className="h-11 bg-background/50 border-border/50 focus:bg-background transition-colors"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-11 gradient-primary hover:opacity-90 transition-opacity font-medium" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("common.loading")}
                      </>
                    ) : (
                      t("auth.register")
                    )}
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground animate-fade-in">
          © {new Date().getFullYear()} Vimob. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
