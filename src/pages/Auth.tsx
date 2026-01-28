import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { sanitizeRedirectPath } from "@/lib/authStorage";

// Schema de validação para login (aceita username ou email)
const loginSchema = z.object({
  usernameOrEmail: z
    .string()
    .trim()
    .min(3, "Username ou email muito curto")
    .max(255, "Username ou email muito longo"),
  password: z
    .string()
    .min(8, "Senha deve ter no mínimo 8 caracteres")
    .regex(/[A-Z]/, "Senha deve conter ao menos 1 letra maiúscula")
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, "Senha deve conter ao menos 1 caractere especial")
    .max(100, "Senha muito longa"),
});

// Schema de validação para cadastro (não herda do login, tem email próprio)
const signupSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Email inválido")
    .max(255, "Email muito longo"),
  password: z
    .string()
    .min(8, "Senha deve ter no mínimo 8 caracteres")
    .regex(/[A-Z]/, "Senha deve conter ao menos 1 letra maiúscula")
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, "Senha deve conter ao menos 1 caractere especial")
    .max(100, "Senha muito longa"),
  fullName: z
    .string()
    .trim()
    .min(3, "Nome deve ter no mínimo 3 caracteres")
    .max(100, "Nome muito longo")
    .regex(/^[A-Za-zÀ-ÿ\s]+$/, "Nome deve conter apenas letras"),
  phone: z
    .string()
    .regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, "Telefone inválido. Use: (11) 99999-9999")
    .optional()
    .or(z.literal("")),
});

// Schema de validação para recuperação de senha
const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Email inválido")
    .max(255, "Email muito longo"),
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;
type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Extract and sanitize redirect from URL
  const redirectTarget = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    const redirect = searchParams.get("redirect");
    return sanitizeRedirectPath(redirect);
  }, [location.search]);

  const form = useForm<LoginFormData | SignupFormData | ForgotPasswordFormData>({
    resolver: zodResolver(
      isForgotPassword ? forgotPasswordSchema : isLogin ? loginSchema : signupSchema
    ),
    defaultValues: {
      usernameOrEmail: "",
      email: "",
      password: "",
      fullName: "",
      phone: "",
    },
  });

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate(redirectTarget, { replace: true });
      }
    });
  }, [navigate, redirectTarget]);

  const handleAuth = async (values: LoginFormData | SignupFormData | ForgotPasswordFormData) => {
    try {
      if (isForgotPassword) {
        const forgotValues = values as ForgotPasswordFormData;
        const { error } = await supabase.auth.resetPasswordForEmail(forgotValues.email, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        });

        if (error) throw error;

        toast({
          title: "Email enviado!",
          description: "Verifique sua caixa de entrada para redefinir sua senha.",
        });

        setIsForgotPassword(false);
        setIsLogin(true);
        form.reset();
      } else if (isLogin) {
        const loginValues = values as LoginFormData;
        
        // Call the login-with-username edge function
        const { data, error } = await supabase.functions.invoke('login-with-username', {
          body: {
            username_or_email: loginValues.usernameOrEmail,
            password: loginValues.password,
          },
        });

        // Network/transport errors
        if (error) {
          throw new Error(error.message || 'Falha ao realizar login');
        }

        // Function-level errors (we return 200 with success=false to avoid hard-fail overlays)
        if (data?.success === false || data?.error) {
          throw new Error(data?.error || 'Credenciais inválidas');
        }

        // Set the session manually
        if (data.session) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });

          if (sessionError) throw sessionError;
        }

        toast({
          title: "Login realizado com sucesso!",
          description: "Redirecionando...",
        });

        navigate(redirectTarget, { replace: true });
      } else {
        const signupValues = values as SignupFormData;
        const { error } = await supabase.auth.signUp({
          email: signupValues.email,
          password: signupValues.password,
          options: {
            data: {
              full_name: signupValues.fullName,
              phone: signupValues.phone || "",
            },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) throw error;

        toast({
          title: "Cadastro realizado!",
          description: "Você já pode fazer login.",
        });

        setIsLogin(true);
        form.reset();
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {isForgotPassword ? "Recuperar Senha" : isLogin ? "Login" : "Cadastro"}
          </CardTitle>
          <CardDescription>
            {isForgotPassword
              ? "Digite seu email para receber instruções"
              : isLogin
              ? "Entre com suas credenciais"
              : "Crie sua conta para começar"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAuth)} className="space-y-4">
              {!isLogin && !isForgotPassword && (
                <>
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="João da Silva" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone (opcional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="(11) 99999-9999" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
              
              {isLogin ? (
                <FormField
                  control={form.control}
                  name="usernameOrEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Usuário ou Email</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Digite seu username ou email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {!isForgotPassword && (
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" />
                      </FormControl>
                      <FormMessage />
                      {!isLogin && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Mínimo 8 caracteres, com maiúscula, minúscula, número e caractere especial
                        </p>
                      )}
                    </FormItem>
                  )}
                />
              )}
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting 
                  ? "Carregando..." 
                  : isForgotPassword 
                  ? "Enviar link de recuperação"
                  : isLogin ? "Entrar" : "Cadastrar"}
              </Button>
            </form>
          </Form>
          
          <div className="mt-4 text-center text-sm space-y-2">
            {!isForgotPassword && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    form.reset();
                  }}
                  className="text-primary hover:underline block w-full"
                >
                  {isLogin
                    ? "Não tem conta? Cadastre-se"
                    : "Já tem conta? Faça login"}
                </button>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      form.reset();
                    }}
                    className="text-primary hover:underline block w-full"
                  >
                    Esqueci minha senha
                  </button>
                )}
              </>
            )}
            {isForgotPassword && (
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setIsLogin(true);
                  form.reset();
                }}
                className="text-primary hover:underline block w-full"
              >
                Voltar para login
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
