import { useState, useEffect, useMemo } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    .regex(
      /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
      "Senha deve conter ao menos 1 caractere especial",
    )
    .max(100, "Senha muito longa"),
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
type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

const Auth = () => {
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Extract and sanitize redirect from URL
  const redirectTarget = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    const redirect = searchParams.get("redirect");
    return sanitizeRedirectPath(redirect);
  }, [location.search]);

  const form = useForm<LoginFormData | ForgotPasswordFormData>({
    resolver: zodResolver(
      isForgotPassword ? forgotPasswordSchema : loginSchema,
    ),
    defaultValues: {
      usernameOrEmail: "",
      email: "",
      password: "",
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

  const handleAuth = async (values: LoginFormData | ForgotPasswordFormData) => {
    try {
      if (isForgotPassword) {
        const forgotValues = values as ForgotPasswordFormData;
        const { error } = await supabase.auth.resetPasswordForEmail(
          forgotValues.email,
          {
            redirectTo: `${window.location.origin}/auth/reset-password`,
          },
        );

        if (error) throw error;

        toast({
          title: "Email enviado!",
          description:
            "Verifique sua caixa de entrada para redefinir sua senha.",
        });

        setIsForgotPassword(false);
        form.reset();
      } else {
        const loginValues = values as LoginFormData;

        // Call the login-with-username edge function
        const { data, error } = await supabase.functions.invoke(
          "login-with-username",
          {
            body: {
              username_or_email: loginValues.usernameOrEmail,
              password: loginValues.password,
            },
          },
        );

        // Network/transport errors
        if (error) {
          throw new Error(error.message || "Falha ao realizar login");
        }

        // Function-level errors (we return 200 with success=false to avoid hard-fail overlays)
        if (data?.success === false || data?.error) {
          throw new Error(data?.error || "Credenciais inválidas");
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
            {isForgotPassword ? "Recuperar Senha" : "Login"}
          </CardTitle>
          <CardDescription>
            {isForgotPassword
              ? "Digite seu email para receber instruções"
              : "Entre com suas credenciais"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleAuth)}
              className="space-y-4"
            >
              {isForgotPassword ? (
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
              ) : (
                <FormField
                  control={form.control}
                  name="usernameOrEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Usuário ou Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Digite seu username ou email"
                        />
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
                        <div className="relative">
                          <Input
                            {...field}
                            type={showPassword ? "text" : "password"}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            tabIndex={-1}
                            aria-label={
                              showPassword ? "Ocultar senha" : "Mostrar senha"
                            }
                          >
                            {showPassword ? (
                              <EyeOff size={18} />
                            ) : (
                              <Eye size={18} />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
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
                    : "Entrar"}
              </Button>
            </form>
          </Form>

          <div className="mt-4 text-center text-sm space-y-2">
            {!isForgotPassword && (
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
            {isForgotPassword && (
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
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
