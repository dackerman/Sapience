import { Clock, Bookmark, Share, ExternalLink, RefreshCw, Maximize2, FileText, BookOpen, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Article, Feed, ArticleSummary, ArticleWithSummary } from "@/lib/types";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import IframeArticle from "./IframeArticle";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";

// Component to handle regeneration of article summaries
function RegenerateSummaryButton({ articleId }: { articleId: number }) {
  const { toast } = useToast();

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/articles/${articleId}/regenerate-summary`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Article summary regeneration started. This may take a few moments.",
      });

      // Give the server some time to process before invalidating
      //setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: [`/api/articles/${articleId}/summary`]
        });
      //}, 5000);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to regenerate article summary",
        variant: "destructive",
      });
    }
  });

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => regenerateMutation.mutate()}
      disabled={regenerateMutation.isPending}
      className="flex items-center gap-1"
    >
      <RefreshCw className={`h-3 w-3 ${regenerateMutation.isPending ? 'animate-spin' : ''}`} />
      {regenerateMutation.isPending ? 'Regenerating...' : 'Regenerate Summary'}
    </Button>
  );
};

interface ArticleViewProps {
  article: Article | null;
  feed: Feed | null;
  isLoading: boolean;
}

export default function ArticleView({
  article,
  feed,
  isLoading,
}: ArticleViewProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  // State to toggle between summary and full content
  const [showFullContent, setShowFullContent] = useState(false);
  // State for vote preference dialog
  const [voteDialogOpen, setVoteDialogOpen] = useState(false);
  const [voteType, setVoteType] = useState<"upvote" | "downvote" | null>(null);
  const [explanation, setExplanation] = useState("");

  // Fetch external content if we don't have article content
  const {
    data: externalContent,
    isLoading: externalContentLoading,
    refetch: refetchExternalContent,
  } = useQuery<{ content: string }>({
    queryKey: article ? ["/api/articles", article.id, "content"] : [""],
    enabled: !!article && showFullContent && (!article.content || article.content.length < 100),
    staleTime: Infinity,
    retry: 1,
  });

  // Fetch article summary
  const {
    data: articleSummary,
    isLoading: summaryLoading,
  } = useQuery<ArticleSummary>({
    queryKey: article ? [`/api/articles/${article.id}/summary`] : [""],
    enabled: !!article && !showFullContent,
    staleTime: Infinity,
  });

  // Mutation for toggling favorite status
  const toggleFavoriteMutation = useMutation({
    mutationFn: async (article: Article) => {
      const operation = article.favorite ? "unfavorite" : "favorite";
      return apiRequest("POST", `/api/articles/${article.id}/action`, {
        operation,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/articles`] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update favorite status",
        variant: "destructive",
      });
    },
  });

  // Mutation for voting on articles (preference system)
  const voteMutation = useMutation({
    mutationFn: async ({ 
      articleId, 
      preference, 
      explanation 
    }: { 
      articleId: number, 
      preference: 'upvote' | 'downvote', 
      explanation: string 
    }) => {
      return apiRequest("POST", `/api/articles/${articleId}/preference`, {
        preference,
        explanation
      });
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [`/api/articles`] });
      queryClient.invalidateQueries({ queryKey: [`/api/recommendations`] });
      queryClient.invalidateQueries({ queryKey: [`/api/article-preferences`] });
      queryClient.invalidateQueries({ queryKey: [`/api/articles/${article?.id}/preference`] });
      
      toast({
        title: "Success",
        description: `Your feedback has been recorded. Thank you for helping improve our recommendations!`,
      });
      
      // Reset the dialog state
      setVoteDialogOpen(false);
      setExplanation("");
      setVoteType(null);
    },
    onError: (error) => {
      console.error("Error submitting vote:", error);
      toast({
        title: "Error",
        description: "Failed to submit your feedback. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleVote = (type: 'upvote' | 'downvote') => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to vote on articles",
        variant: "destructive",
      });
      return;
    }
    
    // Open dialog to get explanation
    setVoteType(type);
    setVoteDialogOpen(true);
  };

  const submitVote = () => {
    if (!article || !voteType) return;
    
    voteMutation.mutate({
      articleId: article.id,
      preference: voteType,
      explanation
    });
  };

  const handleToggleFavorite = () => {
    if (!article) return;
    toggleFavoriteMutation.mutate(article);
  };

  const openExternalLink = () => {
    if (!article?.link) return;
    window.open(article.link, "_blank", "noopener,noreferrer");
  };

  const shareArticle = async () => {
    if (!article) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: article.title,
          text: article.description || "",
          url: article.link,
        });
      } else {
        // Fallback to copying to clipboard
        await navigator.clipboard.writeText(article.link);
        toast({
          title: "Link copied",
          description: "Article link copied to clipboard",
        });
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  // Format the date nicely
  const formatDate = (date?: Date | string | null) => {
    if (!date) return "";

    try {
      return format(new Date(date), "MMMM d, yyyy");
    } catch (error) {
      return "";
    }
  };

  if (!article) {
    return (
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-6 text-gray-500">
            <p className="text-lg">Select an article to read</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden" data-testid="article-view">
      <div className="border-b border-gray-200 py-3 px-4 md:px-6 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-6 w-full md:w-96" />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center text-xs text-gray-500 mb-1 gap-1">
                {article.category && (
                  <span className="font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full mr-2">
                    {article.category.split(",")[0]}
                  </span>
                )}
                <span className="truncate">{feed?.title}</span>
                <span className="mx-1 md:mx-2">•</span>
                <div className="flex items-center">
                  <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                  <span>{formatDate(article.pubDate)}</span>
                </div>
              </div>
              <h2 className="text-lg md:text-xl font-semibold line-clamp-2">
                {article.title}
              </h2>
            </>
          )}
        </div>
        <div className="flex space-x-2 self-end md:self-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleFavorite}
            className={`${article.favorite ? "text-yellow-500" : ""} h-8 w-8 p-0`}
            title={
              article.favorite ? "Remove from bookmarks" : "Add to bookmarks"
            }
          >
            <Bookmark
              className="h-4 w-4"
              fill={article.favorite ? "currentColor" : "none"}
            />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={shareArticle}
            className="h-8 w-8 p-0"
            title="Share article"
          >
            <Share className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={openExternalLink}
            className="h-8 w-8 p-0"
            title="Open in new tab"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 overflow-y-auto p-4 md:p-6">
        {isLoading ? (
          <div className="space-y-4 max-w-3xl mx-auto">
            <Skeleton className="h-36 md:h-48 w-full rounded-lg mb-6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : (
          <div className="article-content max-w-3xl mx-auto">
            {article.imageUrl && (
              <img
                src={article.imageUrl}
                alt={article.title}
                className="w-full rounded-lg mb-4 md:mb-6 max-h-64 md:max-h-96 object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                }}
              />
            )}

            {!showFullContent ? (
              // SUMMARY VIEW
              <>
                {summaryLoading ? (
                  <div className="space-y-4 py-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ) : (
                  <div className="prose prose-sm md:prose max-w-none">
                    {/* Display article summary if available */}
                    {articleSummary ? (
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mb-4">
                        <h3 className="text-base md:text-lg font-medium mb-2">Summary</h3>

                        {/* Check if there's a valid, non-empty summary */}
                        {articleSummary.summary &&
                         articleSummary.summary.trim().length > 0 &&
                         !articleSummary.summary.toLowerCase().includes("error") ? (
                          <p className="text-sm md:text-base">{articleSummary.summary}</p>
                        ) : (
                          <div>
                            <p className="text-slate-500 italic mb-2">Summary not available for this article.</p>
                            <RegenerateSummaryButton articleId={article.id} />
                          </div>
                        )}

                        {articleSummary.keywords && articleSummary.keywords.length > 0 && (
                          <div className="mt-3">
                            <h4 className="text-xs uppercase text-slate-500 font-medium">Keywords</h4>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {articleSummary.keywords.map((keyword, index) => (
                                <span key={index} className="inline-block bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-xs">
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Always show the View Full Post button */}
                        <div className="mt-3">
                          <Button
                            variant="outline"
                            onClick={() => setShowFullContent(true)}
                            className="flex items-center gap-1"
                          >
                            <BookOpen className="h-4 w-4" />
                            View Full Post
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mb-4">
                        <p className="text-slate-500 italic">No summary available for this article.</p>
                        <RegenerateSummaryButton articleId={article.id} />

                        {/* Always show the View Full Post button */}
                        <div className="mt-3">
                          <Button
                            variant="outline"
                            onClick={() => setShowFullContent(true)}
                            className="flex items-center gap-1"
                          >
                            <BookOpen className="h-4 w-4" />
                            View Full Post
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Preview of article description */}
                    {article.description && (
                      <div className="line-clamp-3 text-slate-600 mb-4">
                        <p>{article.description}</p>
                      </div>
                    )}
                    
                    {/* Article voting UI for summary view */}
                    <div className="flex flex-col gap-2 mt-6 border-t pt-4 border-gray-200">
                      <p className="text-sm text-gray-500">Help improve our recommendations:</p>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex items-center gap-1"
                          onClick={() => handleVote('upvote')}
                        >
                          <ThumbsUp className="h-4 w-4" />
                          Helpful
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex items-center gap-1"
                          onClick={() => handleVote('downvote')}
                        >
                          <ThumbsDown className="h-4 w-4" />
                          Not Helpful
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* We don't need this button anymore as it's been moved into the summary box */}
              </>
            ) : (
              // FULL CONTENT VIEW
              <>
                {externalContentLoading ? (
                  <div className="space-y-4 py-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <div className="flex justify-center mt-4">
                      <p className="text-sm text-gray-500">
                        Fetching original article content...
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Use IframeArticle to isolate external CSS */}
                    <IframeArticle
                      content={
                        externalContent?.content ||
                        article.content ||
                        article.description ||
                        '<p>No content available. Click "Read original article" below to view the content on the original website.</p>'
                      }
                      title={article.title}
                    />

                    <div className="flex justify-between mt-4">
                      {/* Toggle button to show summary */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowFullContent(false)}
                        className="flex items-center gap-1"
                      >
                        <FileText className="h-3 w-3" />
                        View Summary
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetchExternalContent()}
                        className="flex items-center gap-1"
                        disabled={externalContentLoading}
                      >
                        <RefreshCw className="h-3 w-3" />
                        Refresh content
                      </Button>
                    </div>
                  </>
                )}

                {/* Article voting UI */}
                <div className="flex flex-col gap-2 mt-6 border-t pt-4 border-gray-200">
                  <p className="text-sm text-gray-500">Help improve our recommendations:</p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex items-center gap-1"
                      onClick={() => handleVote('upvote')}
                    >
                      <ThumbsUp className="h-4 w-4" />
                      Helpful
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex items-center gap-1"
                      onClick={() => handleVote('downvote')}
                    >
                      <ThumbsDown className="h-4 w-4" />
                      Not Helpful
                    </Button>
                  </div>
                </div>

                <div className="mt-6 md:mt-8 border-t border-gray-200 pt-4">
                  <a
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center text-sm md:text-base"
                  >
                    Read original article
                    <ExternalLink className="ml-1 h-3 w-3 md:h-4 md:w-4" />
                  </a>
                </div>
              </>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Preference explanation dialog */}
      <Dialog open={voteDialogOpen} onOpenChange={setVoteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {voteType === 'upvote' ? 'What was helpful about this article?' : 'What was not helpful about this article?'}
            </DialogTitle>
            <DialogDescription>
              Your feedback helps us improve article recommendations for you and other users.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="explanation">Explanation (optional)</Label>
              <Textarea
                id="explanation"
                placeholder={voteType === 'upvote' 
                  ? "What did you like about this article? Was it informative, well-written, relevant to your interests?"
                  : "What didn't you like? Was it irrelevant, poorly written, or not what you expected?"}
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                className="min-h-[120px]"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              onClick={submitVote} 
              disabled={voteMutation.isPending}
            >
              {voteMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
