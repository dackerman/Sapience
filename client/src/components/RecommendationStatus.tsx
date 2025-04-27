import React from 'react';
import { Badge } from "@/components/ui/badge";
import { CheckIcon, XIcon, HelpCircleIcon } from "lucide-react";

export type RecommendationStatus = "recommended" | "not-recommended" | "not-processed";

interface RecommendationStatusBadgeProps {
  status: RecommendationStatus;
  score?: number;
}

/**
 * Component to display the recommendation status of an article
 */
export function RecommendationStatusBadge({ status, score }: RecommendationStatusBadgeProps) {
  switch (status) {
    case "recommended":
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex gap-1 items-center">
          <CheckIcon className="h-3 w-3" />
          {score ? `${score}%` : 'Recommended'}
        </Badge>
      );
    
    case "not-recommended":
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 flex gap-1 items-center">
          <XIcon className="h-3 w-3" />
          {score ? `${score}%` : 'Not Recommended'}
        </Badge>
      );
    
    case "not-processed":
    default:
      return (
        <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 flex gap-1 items-center">
          <HelpCircleIcon className="h-3 w-3" />
          Not Processed
        </Badge>
      );
  }
}