import { useState } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from '@tanstack/react-query';
import { z } from "zod";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { CategoryWithFeedCount } from '@/lib/types';

// Form schema
const formSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
  categoryId: z.string().optional(),
  autoRefresh: z.boolean().default(false),
});

interface AddFeedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddFeedModal({ isOpen, onClose }: AddFeedModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Fetch categories for the dropdown
  const { data: categories = [] } = useQuery<CategoryWithFeedCount[]>({
    queryKey: ['/api/categories']
  });

  // Form setup
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: "",
      categoryId: "",
      autoRefresh: false,
    },
  });

  // Add feed mutation
  const addFeedMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      setIsSubmitting(true);
      
      try {
        const payload = {
          url: values.url,
          categoryId: values.categoryId ? parseInt(values.categoryId) : undefined,
          autoRefresh: values.autoRefresh,
        };
        
        return await apiRequest('POST', '/api/feeds', payload);
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feeds'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      
      toast({
        title: "Feed added successfully",
        description: "The feed has been added to your collection",
      });
      
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error adding feed",
        description: error.message || "Failed to add feed. Please check the URL and try again.",
        variant: "destructive",
      });
    }
  });

  // Form submission handler
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    addFeedMutation.mutate(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Feed</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RSS Feed URL</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://example.com/feed.xml" 
                      {...field} 
                      autoComplete="off"
                    />
                  </FormControl>
                  <FormDescription>
                    Enter the full URL of the RSS feed you want to add
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="autoRefresh"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Enable auto-refresh
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
            
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline" 
                onClick={onClose}
                className="mt-2 sm:mt-0"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="mt-2 sm:mt-0"
              >
                {isSubmitting ? (
                  <>
                    <span className="mr-2">Adding</span>
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                  </>
                ) : "Add Feed"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
