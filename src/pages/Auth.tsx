import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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

// Schema de validação para login
const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Email inválido")
    .max(255, "Email muito longo"),
  password: z
    .string()
    .min(8, "Senha deve ter no mínimo 8 caracteres")
    .regex(/[A-Z]/, "Senha deve conter ao menos 1 letra maiúscula")
    .regex(/[a-z]/, "Senha deve conter ao menos 1 letra minúscula")
    .regex(/[0-9]/, "Senha deve conter ao menos 1 número")
    .regex(/[^A-Za-z0-9]/, "Senha deve conter ao menos 1 caractere especial (!@#$%)")
    .max(100, "Senha muito longa"),
});

// Schema de validação para cadastro
const signupSchema = loginSchema.extend({
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

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<LoginFormData | SignupFormData>({
    resolver: zodResolver(isLogin ? loginSchema : signupSchema),
    defaultValues: {
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
        navigate("/");
      }
    });
  }, [navigate]);

  const handleAuth = async (values: LoginFormData | SignupFormData) => {
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });

        if (error) throw error;

        toast({
          title: "Login realizado com sucesso!",
          description: "Redirecionando...",
        });

        navigate("/");
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
          <CardTitle>{isLogin ? "Login" : "Cadastro"}</CardTitle>
          <CardDescription>
            {isLogin
              ? "Entre com suas credenciais"
              : "Crie sua conta para começar"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAuth)} className="space-y-4">
              {!isLogin && (
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
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting 
                  ? "Carregando..." 
                  : isLogin ? "Entrar" : "Cadastrar"}
              </Button>
            </form>
          </Form>
          
          <div className="mt-4 text-center text-sm">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                form.reset();
              }}
              className="text-primary hover:underline"
            >
              {isLogin
                ? "Não tem conta? Cadastre-se"
                : "Já tem conta? Faça login"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
