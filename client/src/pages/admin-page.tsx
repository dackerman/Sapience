import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  BadgeCheck,
  Database,
  BarChart3,
  FileText,
  ThumbsUp,
  ThumbsDown
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";

// Pipeline Status item type
type PipelineItem = {
  id: number;
  title: string;
  feedId: number;
  pubDate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  status: {
    hasContent: boolean;
    hasSummary: boolean;
    summaryStatus: "success" | "error" | "missing";
    processedAt: string | null;
    recommendationCount: number;
    upvoteCount: number;
    downvoteCount: number;
  };
};

// Stats type
type PipelineStats = {
  articles: {
    total: number;
    withContent: number;
  };
  summaries: {
    total: number;
    withErrors: number;
  };
  recommendations: {
    total: number;
    viewed: number;
  };
  preferences: {
    total: number;
    upvotes: number;
    downvotes: number;
  };
  processingQueue: {
    unprocessedArticles: number;
  };
};

// Status badge component
const StatusBadge = ({ status }: { status: "success" | "error" | "missing" | "pending" }) => {
  if (status === "success") {
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Success
      </Badge>
    );
  } else if (status === "error") {
    return (
      <Badge className="bg-red-100 text-red-800 hover:bg-red-200">
        <XCircle className="h-3 w-3 mr-1" />
        Error
      </Badge>
    );
  } else if (status === "pending") {
    return (
      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
        <Clock className="h-3 w-3 mr-1" />
        Pending
      </Badge>
    );
  } else {
    return (
      <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Missing
      </Badge>
    );
  }
};

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [tabValue, setTabValue] = useState<string>("overview");

  // Fetch pipeline data
  const { 
    data: pipelineItems, 
    isLoading: pipelineLoading, 
    refetch: refetchPipeline 
  } = useQuery<PipelineItem[]>({
    queryKey: ["/api/admin/pipeline"],
    enabled: !!user,
  });

  // Fetch stats
  const { 
    data: stats, 
    isLoading: statsLoading, 
    refetch: refetchStats 
  } = useQuery<PipelineStats>({
    queryKey: ["/api/admin/stats"],
    enabled: !!user,
  });

  // Handle triggering article processing
  const handleProcessArticles = async () => {
    try {
      await apiRequest("POST", "/api/test/process-articles", {});
      refetchPipeline();
      refetchStats();
    } catch (error) {
      console.error("Error processing articles:", error);
    }
  };

  // Handle regenerating error summaries
  const handleRegenerateSummaries = async () => {
    try {
      await apiRequest("POST", "/api/regenerate-summaries", {});
      refetchPipeline();
      refetchStats();
    } catch (error) {
      console.error("Error regenerating summaries:", error);
    }
  };

  // Handle refreshing data
  const handleRefreshData = () => {
    refetchPipeline();
    refetchStats();
  };

  // Add state for sidebar toggle
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // If not authenticated or loading
  if (authLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header toggleSidebar={toggleSidebar} />
        <div className="flex-1 flex items-center justify-center">
          <Skeleton className="h-24 w-24 rounded-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header toggleSidebar={toggleSidebar} />
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">Please log in to access the admin dashboard.</p>
          <Button asChild>
            <Link href="/">Go to Login</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Loading states
  if (pipelineLoading || statsLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header toggleSidebar={toggleSidebar} />
        <div className="container py-6 mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-28" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-full max-w-md" />
            </CardHeader>
            <CardContent>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="mb-4">
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header toggleSidebar={toggleSidebar} />
      <div className="container py-6 mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefreshData}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh Data
            </Button>
            <Button variant="outline" size="sm" onClick={handleProcessArticles}>
              <Database className="h-4 w-4 mr-1" />
              Process Articles
            </Button>
            <Button variant="outline" size="sm" onClick={handleRegenerateSummaries}>
              <FileText className="h-4 w-4 mr-1" />
              Regenerate Error Summaries
            </Button>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Articles</CardDescription>
                <CardTitle>{stats.articles.total}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  {stats.articles.withContent} articles with content ({Math.round((stats.articles.withContent / stats.articles.total) * 100)}%)
                </div>
                <Progress 
                  value={(stats.articles.withContent / stats.articles.total) * 100} 
                  className="h-1 mt-2" 
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Summaries</CardDescription>
                <CardTitle>{stats.summaries.total}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  {stats.summaries.withErrors} summaries with errors ({Math.round((stats.summaries.withErrors / stats.summaries.total) * 100)}%)
                </div>
                <Progress 
                  value={((stats.summaries.total - stats.summaries.withErrors) / stats.summaries.total) * 100} 
                  className="h-1 mt-2" 
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Recommendations</CardDescription>
                <CardTitle>{stats.recommendations.total}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  {stats.recommendations.viewed} viewed ({Math.round((stats.recommendations.viewed / stats.recommendations.total) * 100)}%)
                </div>
                <Progress 
                  value={(stats.recommendations.viewed / stats.recommendations.total) * 100} 
                  className="h-1 mt-2" 
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>User Feedback</CardDescription>
                <CardTitle>{stats.preferences.total}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-xs text-muted-foreground">
                  <span className="flex items-center mr-2">
                    <ThumbsUp className="h-3 w-3 mr-1 text-green-500" />
                    {stats.preferences.upvotes}
                  </span>
                  <span className="flex items-center">
                    <ThumbsDown className="h-3 w-3 mr-1 text-red-500" />
                    {stats.preferences.downvotes}
                  </span>
                </div>
                {stats.preferences.total > 0 && (
                  <div className="h-1 mt-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500" 
                      style={{width: `${(stats.preferences.upvotes / stats.preferences.total) * 100}%`}} 
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs value={tabValue} onValueChange={setTabValue}>
          <TabsList className="mb-4">
            <TabsTrigger value="overview">
              <BarChart3 className="h-4 w-4 mr-1" />
              Pipeline Overview
            </TabsTrigger>
            <TabsTrigger value="recent">
              <Clock className="h-4 w-4 mr-1" />
              Recent Articles
            </TabsTrigger>
            <TabsTrigger value="errors">
              <AlertTriangle className="h-4 w-4 mr-1" />
              Error Summaries
            </TabsTrigger>
            <TabsTrigger value="popular">
              <BadgeCheck className="h-4 w-4 mr-1" />
              Popular Articles
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Article Processing Pipeline</CardTitle>
                <CardDescription>
                  View progress of articles through content acquisition, summarization, and recommendation stages
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!pipelineItems || pipelineItems.length === 0 ? (
                  <div className="py-6 text-center text-muted-foreground">
                    No articles found in the system
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-border text-sm font-medium text-muted-foreground">
                          <th className="text-left p-2 pl-4">Article</th>
                          <th className="text-center p-2">Content</th>
                          <th className="text-center p-2">Summary</th>
                          <th className="text-center p-2">Processed</th>
                          <th className="text-center p-2">Recommendations</th>
                          <th className="text-center p-2">Feedback</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pipelineItems.map((item) => (
                          <tr 
                            key={item.id} 
                            className="border-b border-border hover:bg-muted/50 transition-colors"
                          >
                            <td className="p-2 pl-4">
                              <div className="font-medium truncate max-w-xs">
                                {item.title}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {item.pubDate ? formatDistanceToNow(new Date(item.pubDate), { addSuffix: true }) : 'No date'}
                              </div>
                            </td>
                            <td className="text-center p-2">
                              <StatusBadge status={item.status.hasContent ? "success" : "missing"} />
                            </td>
                            <td className="text-center p-2">
                              <StatusBadge status={item.status.summaryStatus} />
                            </td>
                            <td className="text-center p-2">
                              {item.status.processedAt ? (
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(item.status.processedAt), { addSuffix: true })}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">Not processed</span>
                              )}
                            </td>
                            <td className="text-center p-2">
                              <Badge variant="outline">
                                {item.status.recommendationCount}
                              </Badge>
                            </td>
                            <td className="text-center p-2">
                              <div className="flex items-center justify-center space-x-2">
                                <Badge variant="outline" className="bg-green-50 text-green-700">
                                  <ThumbsUp className="h-3 w-3 mr-1" />
                                  {item.status.upvoteCount}
                                </Badge>
                                <Badge variant="outline" className="bg-red-50 text-red-700">
                                  <ThumbsDown className="h-3 w-3 mr-1" />
                                  {item.status.downvoteCount}
                                </Badge>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recent" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Recently Added Articles</CardTitle>
                <CardDescription>
                  Articles newly added to the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!pipelineItems || pipelineItems.length === 0 ? (
                  <div className="py-6 text-center text-muted-foreground">
                    No articles found in the system
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pipelineItems
                      .sort((a, b) => {
                        if (!a.createdAt || !b.createdAt) return 0;
                        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                      })
                      .slice(0, 10)
                      .map((item) => (
                        <div key={item.id} className="flex items-center justify-between border-b border-border pb-4">
                          <div>
                            <div className="font-medium">{item.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.pubDate ? formatDistanceToNow(new Date(item.pubDate), { addSuffix: true }) : 'No date'}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={item.status.hasContent ? "success" : "missing"} />
                            <StatusBadge status={item.status.summaryStatus} />
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="errors" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Error Summaries</CardTitle>
                <CardDescription>
                  Articles with summary generation errors
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!pipelineItems || pipelineItems.filter(item => item.status.summaryStatus === "error").length === 0 ? (
                  <div className="py-6 text-center text-muted-foreground">
                    No articles with summary errors
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pipelineItems
                      .filter(item => item.status.summaryStatus === "error")
                      .map((item) => (
                        <div key={item.id} className="flex items-center justify-between border-b border-border pb-4">
                          <div>
                            <div className="font-medium">{item.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.pubDate ? formatDistanceToNow(new Date(item.pubDate), { addSuffix: true }) : 'No date'}
                            </div>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => {
                            apiRequest("POST", `/api/articles/${item.id}/regenerate-summary`, {});
                          }}>
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Regenerate
                          </Button>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="popular" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Popular Articles</CardTitle>
                <CardDescription>
                  Articles with the most recommendations and positive feedback
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!pipelineItems || pipelineItems.length === 0 ? (
                  <div className="py-6 text-center text-muted-foreground">
                    No articles found in the system
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pipelineItems
                      .filter(item => item.status.recommendationCount > 0 || item.status.upvoteCount > 0)
                      .sort((a, b) => {
                        const aScore = a.status.recommendationCount + a.status.upvoteCount * 2;
                        const bScore = b.status.recommendationCount + b.status.upvoteCount * 2;
                        return bScore - aScore;
                      })
                      .slice(0, 10)
                      .map((item) => (
                        <div key={item.id} className="flex items-center justify-between border-b border-border pb-4">
                          <div>
                            <div className="font-medium">{item.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.pubDate ? formatDistanceToNow(new Date(item.pubDate), { addSuffix: true }) : 'No date'}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {item.status.recommendationCount} recommendations
                            </Badge>
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              <ThumbsUp className="h-3 w-3 mr-1" />
                              {item.status.upvoteCount}
                            </Badge>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}