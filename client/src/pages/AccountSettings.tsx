import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, User, BarChart3, Crown, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import PageLayout from "@/components/Layout/PageLayout";
import StandardHeader from "@/components/Layout/StandardHeader";
import type { AnalysisLimits } from "@shared/schema";

export default function AccountSettings() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch user analysis limits
  const { data: analysisLimits } = useQuery<AnalysisLimits>({
    queryKey: ["/api/analysis/limits"],
    retry: false,
  });

  const usagePercentage = analysisLimits 
    ? Math.round((analysisLimits.current / analysisLimits.max) * 100)
    : 0;

  const headerActions = (
    <Button 
      variant="outline" 
      size="sm"
      onClick={() => setLocation("/dashboard")}
      className="flex items-center gap-2"
    >
      <ArrowLeft className="w-4 h-4" />
      Back to Dashboard
    </Button>
  );

  return (
    <PageLayout>
      <StandardHeader 
        title="kanolens" 
        subtitle="Account Settings"
        actions={headerActions}
      />
      
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Name
                </label>
                <p className="text-base text-gray-900 dark:text-white">
                  {user && typeof user === 'object' && 'firstName' in user ? String(user.firstName) : ''} {user && typeof user === 'object' && 'lastName' in user ? String(user.lastName) : ''}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <p className="text-base text-gray-900 dark:text-white">
                  {user && typeof user === 'object' && 'email' in user ? String(user.email) : ''}
                </p>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Account Type
              </label>
              <div className="flex items-center gap-2 mt-1">
                {analysisLimits?.isUnlimited ? (
                  <Badge variant="default" className="flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    Unlimited Access
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    Free Account
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Limits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Analysis Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analysisLimits ? (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Current Usage
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {analysisLimits.current} / {analysisLimits.isUnlimited ? '∞' : analysisLimits.max}
                    </span>
                  </div>
                  {!analysisLimits.isUnlimited && (
                    <Progress value={usagePercentage} className="h-2" />
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {analysisLimits.current}
                    </div>
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      Analyses Created
                    </div>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {analysisLimits.isUnlimited ? '∞' : analysisLimits.remainingAnalyses}
                    </div>
                    <div className="text-sm text-green-700 dark:text-green-300">
                      Remaining
                    </div>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {analysisLimits.isUnlimited ? '∞' : analysisLimits.max}
                    </div>
                    <div className="text-sm text-purple-700 dark:text-purple-300">
                      Total Limit
                    </div>
                  </div>
                </div>

                {!analysisLimits.isUnlimited && !analysisLimits.canCreateMore && (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                      <Trash2 className="w-4 h-4" />
                      <span className="font-medium">Limit Reached</span>
                    </div>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      You've reached your analysis limit. Delete an existing analysis to create a new one.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4"></div>
                <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded"></div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upgrade Section */}
        {!analysisLimits?.isUnlimited && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5" />
                Upgrade Account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Paid Accounts Coming Soon!
                </h3>
                <p className="text-blue-700 dark:text-blue-300 text-sm mb-3">
                  We're working on premium plans that will include unlimited analyses, advanced features, and priority support.
                </p>
                <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1 mb-4">
                  <li>• Unlimited competitive analyses</li>
                  <li>• Advanced export options</li>
                  <li>• Custom branding</li>
                  <li>• Priority customer support</li>
                </ul>
                <Button disabled variant="outline" size="sm">
                  Get Notified When Available
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Separator />
        
        {/* Account Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Account Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button 
                variant="outline" 
                onClick={() => setLocation("/dashboard")}
                className="w-full sm:w-auto"
              >
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </PageLayout>
  );
}