import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageLayout from "@/components/Layout/PageLayout";
import StandardHeader from "@/components/Layout/StandardHeader";
import { useLocation } from "wouter";
import { AlertCircle, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const [, setLocation] = useLocation();

  const handleGoHome = () => {
    setLocation("/dashboard");
  };

  const handleGoBack = () => {
    window.history.back();
  };

  return (
    <PageLayout>
      <StandardHeader 
        title="kanolens" 
        subtitle="Page Not Found"
        actions={
          <Button variant="outline" onClick={handleGoHome}>
            <Home className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
        }
      />
      
      <main className="max-w-7xl mx-auto px-4 py-16">
        <div className="flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                404 - Page Not Found
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-gray-600">
                Sorry, we couldn't find the page you're looking for. It may have been moved, deleted, or the URL might be incorrect.
              </p>
              
              <div className="flex flex-col gap-3 pt-4">
                <Button onClick={handleGoHome} className="w-full">
                  <Home className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </Button>
                <Button variant="outline" onClick={handleGoBack} className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go Back
                </Button>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Need help? Check out our{" "}
                  <button 
                    onClick={() => setLocation("/agent-architecture")}
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Agent Architecture
                  </button>{" "}
                  or contact support.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </PageLayout>
  );
}
