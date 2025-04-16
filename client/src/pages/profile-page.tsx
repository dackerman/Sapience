import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

// Define the user profile interface
interface UserProfile {
  id: number;
  userId: number;
  interests: string;
  createdAt?: string;
  updatedAt?: string;
}

// Profile form schema for validation
const profileSchema = z.object({
  interests: z.string()
    .min(10, "Please describe your interests with at least 10 characters")
    .max(1000, "Interests description should be less than 1000 characters"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Get user profile
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
    enabled: !!user,
  });

  // Profile form initialization
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      interests: profile?.interests || "",
    },
    values: {
      interests: profile?.interests || "",
    },
  });

  // Update form values when profile data is loaded or changes
  useEffect(() => {
    if (profile) {
      console.log('Profile data loaded:', profile);
      
      // Reset the form with the profile data
      const interests = profile.interests || "";
      console.log('Setting interests to:', interests);
      
      // Update form fields explicitly
      form.setValue("interests", interests);
    }
  }, [profile, form]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      const res = await apiRequest("PUT", "/api/profile", values);
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate both the profile and recommendations data
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
      toast({
        title: "Profile updated",
        description: "Your interests have been saved successfully and recommendations are being regenerated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle profile form submission
  const onSubmit = async (values: ProfileFormValues) => {
    try {
      await updateProfileMutation.mutateAsync(values);
    } catch (error) {
      console.error("Profile update error:", error);
      // Form was already handled by the mutation error callback
    }
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 px-4 md:px-6">
      <h1 className="text-3xl font-bold mb-8">Your Profile</h1>
      
      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>
              Your basic account information.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div>
                <h3 className="font-medium mb-1">Username</h3>
                <p className="text-muted-foreground">{user?.username}</p>
              </div>
              <div>
                <h3 className="font-medium mb-1">Email</h3>
                <p className="text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content Preferences</CardTitle>
            <CardDescription>
              Describe your interests to help our AI recommend relevant content.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="interests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interests</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your interests to help us recommend content. For example: 'I'm interested in technology, specifically AI and machine learning. I also follow climate science, renewable energy, and enjoy reading about history and philosophy.'"
                          className="min-h-32"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        The more detailed your interests are, the better our recommendations will be.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="w-full md:w-auto"
                >
                  {updateProfileMutation.isPending ? "Saving..." : "Save preferences"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}